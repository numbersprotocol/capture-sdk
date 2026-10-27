import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { Wallet } from 'ethers'

const require = createRequire(import.meta.url)
const formats = {
  ESM: await import('@numbersprotocol/capture-sdk'),
  CommonJS: require('@numbersprotocol/capture-sdk'),
}
const bytes = Buffer.from('capture-runtime-fixture')
const digest = (data) => createHash('sha256').update(data).digest('hex')

for (const [format, sdk] of Object.entries(formats)) {
  test(`${format}：Node.js 核心流程`, { timeout: 15000 }, async (t) => {
    const requests = []
    const server = createServer(async (request, response) => {
      try {
        const chunks = []
        for await (const chunk of request) chunks.push(chunk)
        const body = Buffer.concat(chunks)
        const form = body.length
          ? await new Request('http://localhost', {
              method: request.method,
              headers: request.headers,
              body,
            }).formData()
          : undefined
        requests.push({ method: request.method, url: request.url, headers: request.headers, form })
        const status = request.url === '/assets/missing/' ? 404
          : request.url === '/assets/unauthorized/' ? 401 : 200
        response.writeHead(status, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify(status !== 200 ? { detail: '測試錯誤' } : {
          id: 'fixture-nid',
          asset_file_name: form?.get('asset_file')?.name ?? 'fixture.png',
          asset_file_mime_type: form?.get('asset_file')?.type ?? 'image/png',
          caption: form?.get('caption') ?? '',
          headline: form?.get('headline') ?? '',
        }))
      } catch (error) {
        response.writeHead(500, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ detail: error.message }))
      }
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    t.after(() => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
      server.closeAllConnections()
    }))
    const directory = await mkdtemp(join(tmpdir(), 'capture-runtime-'))
    t.after(() => rm(directory, { recursive: true, force: true }))
    const path = join(directory, 'fixture.png')
    await writeFile(path, bytes)
    const capture = new sdk.Capture({
      token: 'local-runtime-test',
      baseUrl: `http://127.0.0.1:${server.address().port}`,
    })

    await t.test('SHA-256 與 Uint8Array 子區段', async () => {
      assert.equal(await sdk.sha256(new TextEncoder().encode('abc')),
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
      assert.equal(await sdk.sha256(bytes.subarray(2, 9)), digest(bytes.subarray(2, 9)))
    })

    const padded = Buffer.concat([Buffer.from('前'), bytes, Buffer.from('後')])
    const offset = Buffer.byteLength('前')
    const inputs = {
      path: [path, {}],
      Buffer: [padded.subarray(offset, offset + bytes.length), { filename: 'fixture.png' }],
      Uint8Array: [new Uint8Array(bytes), { filename: 'fixture.png' }],
      Blob: [new Blob([bytes], { type: 'image/png' }), { filename: 'fixture.png' }],
      File: [new File([bytes], 'fixture.png', { type: 'image/png' }), {}],
    }
    for (const [kind, [input, options]] of Object.entries(inputs)) {
      await t.test(`${kind} 註冊經由原生 fetch/FormData 傳送完整內容`, async () => {
        const asset = await capture.register(input, { ...options, caption: '說明', publicAccess: false })
        assert.equal(asset.nid, 'fixture-nid')
        assert.equal(asset.filename, 'fixture.png')
        assert.equal(asset.mimeType, 'image/png')
        assert.equal(asset.caption, '說明')
        const request = requests.at(-1)
        assert.equal(request.method, 'POST')
        assert.equal(request.url, '/assets/')
        assert.equal(request.headers.authorization, 'token local-runtime-test')
        assert.match(request.headers['content-type'], /^multipart\/form-data; boundary=/)
        assert.equal(request.form.get('public_access'), 'false')
        assert.equal(request.form.has('token'), false)
        assert.deepEqual(Buffer.from(await request.form.get('asset_file').arrayBuffer()), bytes)
      })
    }

    await t.test('簽章對應上傳內容與 metadata', async () => {
      const wallet = Wallet.createRandom()
      await capture.register(bytes, { filename: 'fixture.png', sign: { privateKey: wallet.privateKey } })
      const form = requests.at(-1).form
      const metadata = form.get('signed_metadata')
      const proof = JSON.parse(metadata)
      const [signature] = JSON.parse(form.get('signature'))
      assert.equal(proof.proof_hash, digest(bytes))
      assert.equal(proof.asset_mime_type, 'image/png')
      assert.equal(signature.proofHash, proof.proof_hash)
      assert.equal(signature.integritySha, digest(metadata))
      assert.equal(signature.publicKey, wallet.address)
      assert.equal(sdk.verifySignature(signature.integritySha, signature.signature, wallet.address), true)
      assert.equal(sdk.verifySignature('tampered', signature.signature, wallet.address), false)
      assert.equal(sdk.verifySignature(signature.integritySha, 'invalid', wallet.address), false)
      assert.equal(form.get('public_access'), 'true')
      assert.equal(JSON.stringify([...form.entries()]).includes(wallet.privateKey), false)
    })

    await t.test('更新保留空字串、commit 與自訂 metadata', async () => {
      const asset = await capture.update('fixture-nid', {
        caption: '', headline: '更新標題', commitMessage: 'runtime test', customMetadata: { source: 'test' },
      })
      assert.equal(asset.caption, '')
      assert.equal(asset.headline, '更新標題')
      const request = requests.at(-1)
      assert.equal(request.method, 'PATCH')
      assert.equal(request.url, '/assets/fixture-nid/')
      assert.equal(request.form.get('caption'), '')
      assert.equal(request.form.get('commit_message'), 'runtime test')
      assert.deepEqual(JSON.parse(request.form.get('nit_commit_custom')), { source: 'test' })
    })

    await t.test('讀取與 HTTP 錯誤分類', async () => {
      assert.equal((await capture.get('fixture-nid')).nid, 'fixture-nid')
      assert.equal(requests.at(-1).method, 'GET')
      await assert.rejects(capture.get('missing'), sdk.NotFoundError)
      await assert.rejects(capture.get('unauthorized'), sdk.AuthenticationError)
    })

    await t.test('無效檔案在發出請求前被拒絕', async () => {
      const count = requests.length
      await assert.rejects(capture.register(Buffer.alloc(0), { filename: 'empty.png' }), sdk.ValidationError)
      await assert.rejects(capture.register(bytes), sdk.ValidationError)
      await assert.rejects(capture.register(new Blob([bytes])), sdk.ValidationError)
      assert.equal(requests.length, count)
    })
  })
}
