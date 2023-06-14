const namehash = require('eth-ens-namehash')
const { ethers } = require('hardhat')
const sha3 = require('web3-utils').sha3

const UniversalENSRegistry = artifacts.require(
  './universal-registry/UniversalENSRegistry.sol',
)
const MockAddrResolver = artifacts.require('./resolvers/MockAddrResolver.sol')

const { exceptions } = require('../test-utils')

let contracts = [[artifacts.require('./registry/ENSRegistry.sol'), 'Solidity']]

const SET_REGISTRY_MAPPING = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes('UniversalENSRegistry.setRegistryMapping'),
)

const ZERO_NODE =
  '0x0000000000000000000000000000000000000000000000000000000000000000'
const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
const ADDR_REVERSE = ethers.utils.namehash('addr.reverse')

const LABEL1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('node1'))
const LABEL2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('node2'))
const LABEL3 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('node3'))
const LABEL4 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('node4'))
const LABEL5 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('node5'))

const LABEL_REVERSE = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes('reverse'),
)
const LABEL_ADDR = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('addr'))

const NODE1 = ethers.utils.namehash('node1')
const NODE2 = ethers.utils.namehash('node2')
const NODE3 = ethers.utils.namehash('node3')
const NODE4 = ethers.utils.namehash('node4')
const NODE5 = ethers.utils.namehash('node5')

const PK1 = '0x53beef782ea38ccddfa2ed51a11ebffdc25c82ddb85dcb4618e5898a40cee62b'
const PK2 = '0x0ae52b7ba3a307bc1385109c51f0056bcd05af3d4e55d0877468229ad5ed4d8e'
const PK3 = '0x094478ae45aa12f3d1868e5780b32c629b009c6bdd340a8215edf65113d2775f'

const OPERATOR1 = new ethers.Wallet(PK1).address
const OPERATOR2 = new ethers.Wallet(PK2).address
const OPERATOR3 = new ethers.Wallet(PK3).address

function getReverseNode(address) {
  return ethers.utils.namehash(
    address.substring(2).toLowerCase() + '.addr.reverse',
  )
}

contracts.forEach(function ([ENS, lang]) {
  contract('ENS ' + lang, function (accounts) {
    let resolver1, resolver2, resolver3, universal, ens1, ens2, ens3

    async function setRegistryMapping(pk, nonce, registries, chainId = 0) {
      const signer = new ethers.Wallet(pk)
      const digest = chainId
        ? ethers.utils.solidityKeccak256(
            ['bytes32', 'uint256', 'uint256', 'address[]'],
            [SET_REGISTRY_MAPPING, chainId, nonce, registries],
          )
        : ethers.utils.solidityKeccak256(
            ['bytes32', 'uint256', 'address[]'],
            [SET_REGISTRY_MAPPING, nonce, registries],
          )
      const signature = await signer.signMessage(ethers.utils.arrayify(digest))

      return await universal.setRegistryMapping(
        signer.address,
        nonce,
        registries,
        signature,
      )
    }

    async function setSubnodeOwner(ens, resolver, label, account) {
      await ens.setSubnodeOwner(ZERO_NODE, label, account, {
        from: accounts[0],
      })
      const node = ethers.utils.solidityKeccak256(
        ['bytes32', 'bytes32'],
        [ZERO_NODE, label],
      )
      await ens.setResolver(node, resolver.address, { from: account })
      await resolver.methods['setAddr(bytes32,address)'](node, account, {
        from: account,
      })
    }

    async function setReverseRecord(ens, resolver, account, label) {
      const accountHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(account.substring(2).toLowerCase()),
      )
      await ens.setSubnodeOwner(ADDR_REVERSE, accountHash, accounts[0], {
        from: accounts[0],
      })
      const node = getReverseNode(account)
      await ens.setResolver(node, resolver.address, { from: accounts[0] })
      await resolver.methods['setName(bytes32,string)'](node, label, {
        from: accounts[0],
      })
    }

    beforeEach(async () => {
      resolver1 = await MockAddrResolver.new()
      resolver2 = await MockAddrResolver.new()
      resolver3 = await MockAddrResolver.new()

      universal = await UniversalENSRegistry.new()

      ens1 = await ENS.new(accounts[0])
      ens2 = await ENS.new(accounts[0])
      ens3 = await ENS.new(accounts[0])

      await setSubnodeOwner(ens1, resolver1, LABEL1, accounts[1])
      await setSubnodeOwner(ens1, resolver1, LABEL2, accounts[2])
      // await setSubnodeOwner(ens1, resolver1, LABEL3, accounts[3])

      await setSubnodeOwner(ens2, resolver2, LABEL1, accounts[2])
      // await setSubnodeOwner(ens2, resolver2, LABEL2, accounts[3])
      await setSubnodeOwner(ens2, resolver2, LABEL3, accounts[4])

      // await setSubnodeOwner(ens3, resolver3, LABEL1, accounts[3])
      await setSubnodeOwner(ens3, resolver3, LABEL2, accounts[4])
      await setSubnodeOwner(ens3, resolver3, LABEL3, accounts[5])
      await setSubnodeOwner(ens3, resolver3, LABEL5, accounts[1])

      // Setup reverse node
      for (let ens of [ens1, ens2, ens3]) {
        await ens.setSubnodeOwner(ZERO_NODE, LABEL_REVERSE, accounts[0], {
          from: accounts[0],
        })
        await ens.setSubnodeOwner(
          ethers.utils.namehash('reverse'),
          LABEL_ADDR,
          accounts[0],
          {
            from: accounts[0],
          },
        )
      }
    })

    it('Test nonce', async () => {
      await exceptions.expectFailure(setRegistryMapping(PK1, 0, [ens1.address]))
      await setRegistryMapping(PK1, 1, [ens1.address, ens2.address])
      await setRegistryMapping(PK1, 2, [ens1.address])
      await setRegistryMapping(PK1, 5, [ens2.address])
      await exceptions.expectFailure(setRegistryMapping(PK1, 5, [ens1.address]))
      await exceptions.expectFailure(setRegistryMapping(PK1, 4, [ens1.address]))
      await setRegistryMapping(PK1, 6, [ens1.address, ens2.address])

      await setRegistryMapping(PK2, 3, [ens1.address])
      await setRegistryMapping(PK2, 4, [ens1.address, ens2.address])
    })

    it('Test get registry', async () => {
      await setRegistryMapping(PK1, 1, [ens1.address, ens2.address])
      await setRegistryMapping(PK2, 1, [ens2.address, ens3.address])

      assert.equal(await universal.getRegistry(OPERATOR1, NODE1), ens1.address)
      assert.equal(await universal.getRegistry(OPERATOR1, NODE2), ens1.address)
      assert.equal(await universal.getRegistry(OPERATOR1, NODE3), ens2.address)
      assert.equal(await universal.getRegistry(OPERATOR1, NODE4), ADDRESS_ZERO)

      assert.equal(await universal.getRegistry(OPERATOR2, NODE1), ens2.address)
      assert.equal(await universal.getRegistry(OPERATOR2, NODE2), ens3.address)
      assert.equal(await universal.getRegistry(OPERATOR2, NODE3), ens2.address)
      assert.equal(await universal.getRegistry(OPERATOR2, NODE4), ADDRESS_ZERO)

      await setRegistryMapping(PK3, 1, [OPERATOR1, OPERATOR2])

      assert.equal(await universal.getRegistry(OPERATOR3, NODE1), ens1.address)
      assert.equal(await universal.getRegistry(OPERATOR3, NODE2), ens1.address)
      assert.equal(await universal.getRegistry(OPERATOR3, NODE3), ens2.address)
      assert.equal(await universal.getRegistry(OPERATOR3, NODE4), ADDRESS_ZERO)
      assert.equal(await universal.getRegistry(OPERATOR3, NODE5), ens3.address)

      await setRegistryMapping(PK3, 2, [OPERATOR2, OPERATOR1])

      assert.equal(await universal.getRegistry(OPERATOR3, NODE1), ens2.address)
      assert.equal(await universal.getRegistry(OPERATOR3, NODE2), ens3.address)
      assert.equal(await universal.getRegistry(OPERATOR3, NODE3), ens2.address)
      assert.equal(await universal.getRegistry(OPERATOR3, NODE4), ADDRESS_ZERO)
      assert.equal(await universal.getRegistry(OPERATOR3, NODE5), ens3.address)
    })

    it('Test get resolver', async () => {
      await setRegistryMapping(PK1, 1, [ens1.address, ens2.address])
      await setRegistryMapping(PK2, 1, [ens2.address, ens3.address])

      assert.equal(
        await universal.getResolver(OPERATOR1, NODE1),
        resolver1.address,
      )
      assert.equal(
        await universal.getResolver(OPERATOR1, NODE2),
        resolver1.address,
      )
      assert.equal(
        await universal.getResolver(OPERATOR1, NODE3),
        resolver2.address,
      )
      await exceptions.expectFailure(universal.getResolver(OPERATOR1, NODE4))

      assert.equal(
        await universal.getResolver(OPERATOR2, NODE1),
        resolver2.address,
      )
      assert.equal(
        await universal.getResolver(OPERATOR2, NODE2),
        resolver3.address,
      )
      assert.equal(
        await universal.getResolver(OPERATOR2, NODE3),
        resolver2.address,
      )
      await exceptions.expectFailure(universal.getResolver(OPERATOR2, NODE4))

      await setRegistryMapping(PK3, 1, [OPERATOR1, OPERATOR2])

      assert.equal(
        await universal.getResolver(OPERATOR3, NODE1),
        resolver1.address,
      )
      assert.equal(
        await universal.getResolver(OPERATOR3, NODE2),
        resolver1.address,
      )
      assert.equal(
        await universal.getResolver(OPERATOR3, NODE3),
        resolver2.address,
      )
      await exceptions.expectFailure(universal.getResolver(OPERATOR3, NODE4))
      assert.equal(
        await universal.getResolver(OPERATOR3, NODE5),
        resolver3.address,
      )

      await setRegistryMapping(PK3, 2, [OPERATOR2, OPERATOR1])

      assert.equal(
        await universal.getResolver(OPERATOR3, NODE1),
        resolver2.address,
      )
      assert.equal(
        await universal.getResolver(OPERATOR3, NODE2),
        resolver3.address,
      )
      assert.equal(
        await universal.getResolver(OPERATOR3, NODE3),
        resolver2.address,
      )
      await exceptions.expectFailure(universal.getResolver(OPERATOR3, NODE4))
      assert.equal(
        await universal.getResolver(OPERATOR3, NODE5),
        resolver3.address,
      )
    })

    it('Test get address', async () => {
      await setRegistryMapping(PK1, 1, [ens1.address, ens2.address])
      await setRegistryMapping(PK2, 1, [ens2.address, ens3.address])

      assert.equal(await universal.getAddr(OPERATOR1, NODE1), accounts[1])
      assert.equal(await universal.getAddr(OPERATOR1, NODE2), accounts[2])
      assert.equal(await universal.getAddr(OPERATOR1, NODE3), accounts[4])
      await exceptions.expectFailure(universal.getResolver(OPERATOR1, NODE4))

      assert.equal(await universal.getAddr(OPERATOR2, NODE1), accounts[2])
      assert.equal(await universal.getAddr(OPERATOR2, NODE2), accounts[4])
      assert.equal(await universal.getAddr(OPERATOR2, NODE3), accounts[4])
      await exceptions.expectFailure(universal.getResolver(OPERATOR2, NODE4))

      await setRegistryMapping(PK3, 1, [OPERATOR1, OPERATOR2])

      assert.equal(await universal.getAddr(OPERATOR3, NODE1), accounts[1])
      assert.equal(await universal.getAddr(OPERATOR3, NODE2), accounts[2])
      assert.equal(await universal.getAddr(OPERATOR3, NODE3), accounts[4])
      await exceptions.expectFailure(universal.getResolver(OPERATOR3, NODE4))
      assert.equal(await universal.getAddr(OPERATOR3, NODE5), accounts[1])

      await setRegistryMapping(PK3, 2, [OPERATOR2, OPERATOR1])

      assert.equal(await universal.getAddr(OPERATOR3, NODE1), accounts[2])
      assert.equal(await universal.getAddr(OPERATOR3, NODE2), accounts[4])
      assert.equal(await universal.getAddr(OPERATOR3, NODE3), accounts[4])
      await exceptions.expectFailure(universal.getResolver(OPERATOR3, NODE4))
      assert.equal(await universal.getAddr(OPERATOR3, NODE5), accounts[1])
    })

    it('Can resolve basic reverse record', async () => {
      await setReverseRecord(ens1, resolver1, accounts[0], 'node1')
      await setReverseRecord(ens3, resolver3, accounts[0], 'node3')
      await setReverseRecord(ens1, resolver1, accounts[1], 'node2')
      await setReverseRecord(ens2, resolver2, accounts[1], 'node3')

      await setRegistryMapping(PK1, 1, [ens1.address, ens2.address])
      await setRegistryMapping(PK2, 1, [ens2.address, ens3.address])

      assert.equal(await universal.getName(accounts[0], OPERATOR1), 'node1')
      assert.equal(await universal.getName(accounts[0], OPERATOR2), 'node3')
      assert.equal(await universal.getName(accounts[1], OPERATOR1), 'node2')
      assert.equal(await universal.getName(accounts[1], OPERATOR2), 'node3')
      await exceptions.expectFailure(universal.getName(accounts[2], OPERATOR1))

      await setRegistryMapping(PK1, 2, [ens3.address, ens1.address])
      await setRegistryMapping(PK2, 2, [ens1.address, ens3.address])

      assert.equal(await universal.getName(accounts[0], OPERATOR1), 'node3')
      assert.equal(await universal.getName(accounts[0], OPERATOR2), 'node1')
      assert.equal(await universal.getName(accounts[1], OPERATOR1), 'node2')
      assert.equal(await universal.getName(accounts[1], OPERATOR2), 'node2')
      await exceptions.expectFailure(universal.getName(accounts[2], OPERATOR1))

      await universal.setReverseRegistry(ens3.address)

      assert.equal(await universal.getName(accounts[0], OPERATOR1), 'node3')
      assert.equal(await universal.getName(accounts[0], OPERATOR2), 'node3')
      assert.equal(await universal.getName(accounts[1], OPERATOR1), 'node2')
      assert.equal(await universal.getName(accounts[1], OPERATOR2), 'node2')
      await exceptions.expectFailure(universal.getName(accounts[2], OPERATOR1))
    })

    it('Can resolve reverse record of owned smart contracts', async () => {
      await setReverseRecord(ens1, resolver1, resolver1.address, 'node1')
      await setReverseRecord(ens3, resolver3, resolver1.address, 'node3')
      await setReverseRecord(ens1, resolver1, resolver2.address, 'node2')
      await setReverseRecord(ens2, resolver2, resolver2.address, 'node3')

      await setRegistryMapping(PK1, 1, [ens1.address, ens2.address])
      await setRegistryMapping(PK2, 1, [ens2.address, ens3.address])

      assert.equal(
        await universal.getName(resolver1.address, OPERATOR1),
        'node1',
      )
      assert.equal(
        await universal.getName(resolver1.address, OPERATOR2),
        'node3',
      )
      assert.equal(
        await universal.getName(resolver2.address, OPERATOR1),
        'node2',
      )
      assert.equal(
        await universal.getName(resolver2.address, OPERATOR2),
        'node3',
      )
      await exceptions.expectFailure(universal.getName(accounts[2], OPERATOR1))

      await setRegistryMapping(PK1, 2, [ens3.address, ens1.address])
      await setRegistryMapping(PK2, 2, [ens1.address, ens3.address])

      assert.equal(
        await universal.getName(resolver1.address, OPERATOR1),
        'node3',
      )
      assert.equal(
        await universal.getName(resolver1.address, OPERATOR2),
        'node1',
      )
      assert.equal(
        await universal.getName(resolver2.address, OPERATOR1),
        'node2',
      )
      assert.equal(
        await universal.getName(resolver2.address, OPERATOR2),
        'node2',
      )
      await exceptions.expectFailure(universal.getName(accounts[2], OPERATOR1))

      await universal.setReverseRegistryForAddr(resolver1.address, ens3.address)

      assert.equal(
        await universal.getName(resolver1.address, OPERATOR1),
        'node3',
      )
      assert.equal(
        await universal.getName(resolver1.address, OPERATOR2),
        'node3',
      )
      assert.equal(
        await universal.getName(resolver2.address, OPERATOR1),
        'node2',
      )
      assert.equal(
        await universal.getName(resolver2.address, OPERATOR2),
        'node2',
      )
      await exceptions.expectFailure(universal.getName(accounts[2], OPERATOR1))
    })

    it('Can set reverse record with signature', async () => {
      await setReverseRecord(ens1, resolver1, accounts[0], 'node1')
      await setReverseRecord(ens3, resolver3, accounts[0], 'node3')
      await setReverseRecord(ens1, resolver1, accounts[1], 'node2')
      await setReverseRecord(ens2, resolver2, accounts[1], 'node3')

      await setRegistryMapping(PK1, 1, [ens1.address, ens2.address])
      await setRegistryMapping(PK2, 1, [ens2.address, ens3.address])

      assert.equal(await universal.getName(accounts[0], OPERATOR1), 'node1')
      assert.equal(await universal.getName(accounts[0], OPERATOR2), 'node3')
      assert.equal(await universal.getName(accounts[1], OPERATOR1), 'node2')
      assert.equal(await universal.getName(accounts[1], OPERATOR2), 'node3')
      await exceptions.expectFailure(universal.getName(accounts[2], OPERATOR1))

      await setRegistryMapping(PK1, 2, [ens3.address, ens1.address])
      await setRegistryMapping(PK2, 2, [ens1.address, ens3.address])

      assert.equal(await universal.getName(accounts[0], OPERATOR1), 'node3')
      assert.equal(await universal.getName(accounts[0], OPERATOR2), 'node1')
      assert.equal(await universal.getName(accounts[1], OPERATOR1), 'node2')
      assert.equal(await universal.getName(accounts[1], OPERATOR2), 'node2')
      await exceptions.expectFailure(universal.getName(accounts[2], OPERATOR1))

      await universal.setReverseRegistry(ens3.address)

      assert.equal(await universal.getName(accounts[0], OPERATOR1), 'node3')
      assert.equal(await universal.getName(accounts[0], OPERATOR2), 'node3')
      assert.equal(await universal.getName(accounts[1], OPERATOR1), 'node2')
      assert.equal(await universal.getName(accounts[1], OPERATOR2), 'node2')
      await exceptions.expectFailure(universal.getName(accounts[2], OPERATOR1))
    })

    // it('should allow setting resolvers', async () => {
    //   let addr = '0x0000000000000000000000000000000000001234'

    //   let result = await ens.setResolver('0x0', addr, { from: accounts[0] })

    //   assert.equal(await ens.resolver('0x0'), addr)

    //   assert.equal(result.logs.length, 1)
    //   let args = result.logs[0].args
    //   assert.equal(
    //     args.node,
    //     '0x0000000000000000000000000000000000000000000000000000000000000000',
    //   )
    //   assert.equal(args.resolver, addr)
    // })

    // it('should prevent setting resolvers by non-owners', async () => {
    //   await exceptions.expectFailure(
    //     ens.setResolver('0x1', '0x0000000000000000000000000000000000001234', {
    //       from: accounts[0],
    //     }),
    //   )
    // })

    // it('should allow setting the TTL', async () => {
    //   let result = await ens.setTTL('0x0', 3600, { from: accounts[0] })

    //   assert.equal((await ens.ttl('0x0')).toNumber(), 3600)

    //   assert.equal(result.logs.length, 1)
    //   let args = result.logs[0].args
    //   assert.equal(
    //     args.node,
    //     '0x0000000000000000000000000000000000000000000000000000000000000000',
    //   )
    //   assert.equal(args.ttl.toNumber(), 3600)
    // })

    // it('should prevent setting the TTL by non-owners', async () => {
    //   await exceptions.expectFailure(
    //     ens.setTTL('0x1', 3600, { from: accounts[0] }),
    //   )
    // })

    // it('should allow the creation of subnodes', async () => {
    //   let result = await ens.setSubnodeOwner('0x0', sha3('eth'), accounts[1], {
    //     from: accounts[0],
    //   })

    //   assert.equal(await ens.owner(namehash.hash('eth')), accounts[1])

    //   assert.equal(result.logs.length, 1)
    //   let args = result.logs[0].args
    //   assert.equal(
    //     args.node,
    //     '0x0000000000000000000000000000000000000000000000000000000000000000',
    //   )
    //   assert.equal(args.label, sha3('eth'))
    //   assert.equal(args.owner, accounts[1])
    // })

    // it('should prohibit subnode creation by non-owners', async () => {
    //   await exceptions.expectFailure(
    //     ens.setSubnodeOwner('0x0', sha3('eth'), accounts[1], {
    //       from: accounts[1],
    //     }),
    //   )
    // })
  })
})