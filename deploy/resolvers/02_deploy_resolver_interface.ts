import { Interface } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { keccak256 } from 'js-sha3'

const { makeInterfaceId } = require('@openzeppelin/test-helpers')

function computeInterfaceId(iface: Interface) {
  return makeInterfaceId.ERC165(
    Object.values(iface.functions).map((frag) => frag.format('sighash')),
  )
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre
  const { deploy } = deployments
  const { deployer, owner } = await getNamedAccounts()

  const resolver = await ethers.getContract('PublicResolver', owner)
  const nameWrapper = await ethers.getContract('NameWrapper', owner)
  const registry = await ethers.getContract('ENSRegistry', owner)
  const registrar = await ethers.getContract('BaseRegistrarImplementation')
  const controller = await ethers.getContract('ETHRegistrarController', owner)
  const root = await ethers.getContract('Root')

  const resolverContract = await ethers.getContractAt(
    'PublicResolver',
    resolver.address,
  )

  {
    const artifact = await deployments.getArtifact('INameWrapper')
    const interfaceId = computeInterfaceId(new Interface(artifact.abi))

    const tx1 = await resolverContract
      .connect(await ethers.getSigner(owner))
      .setInterface(
        ethers.utils.namehash(process.env.TLD as string),
        interfaceId,
        nameWrapper.address,
      )
    console.log(
      `Setting NameWrapper interface ID ${interfaceId} on .${process.env.TLD} resolver (tx: ${tx1.hash})...`,
    )
    await tx1.wait()
  }

  {
    const artifact = await deployments.getArtifact('IETHRegistrarController')
    const interfaceId = computeInterfaceId(new Interface(artifact.abi))

    const tx2 = await resolverContract
      .connect(await ethers.getSigner(owner))
      .setInterface(
        ethers.utils.namehash(process.env.TLD as string),
        interfaceId,
        controller.address,
      )
    console.log(
      `Setting ETHRegistrarController interface ID ${interfaceId} on .${process.env.TLD} resolver (tx: ${tx2.hash})...`,
    )
    await tx2.wait()
  }

  const tx3 = await root
    .connect(await ethers.getSigner(owner))
    .setSubnodeOwner(
      '0x' + keccak256(process.env.TLD as string),
      registrar.address,
    )
  console.log(
    `Setting owner of eth node to registrar on root (tx: ${tx3.hash})...`,
  )
  await tx3.wait()

  console.log(
    `.${process.env.TLD} owner`,
    await registry.owner(ethers.utils.namehash(process.env.TLD as string)),
    registrar.address,
  )
}

func.id = 'name-wrapper-resolver'
func.tags = ['wrapper-resolver']
func.dependencies = [
  'NameWrapper',
  'resolvers',
  'ETHRegistrarController',
  'Root',
]

export default func
