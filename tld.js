var ethers = require('ethers')
var dotenv = require('dotenv')

const ROOT =
  '0x0000000000000000000000000000000000000000000000000000000000000000'

dotenv.config()

console.log(process.env.TLD)

console.log(
  ethers.utils.solidityKeccak256(
    ['bytes32', 'bytes32'],
    [ROOT, ethers.utils.keccak256(ethers.utils.toUtf8Bytes(process.env.TLD))],
  ),
)
console.log(ethers.utils.namehash(process.env.TLD))

console.log(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(process.env.TLD)))

console.log(ethers.utils.keccak256(ethers.utils.toUtf8Bytes('register')))
console.log(ethers.utils.keccak256(ethers.utils.toUtf8Bytes('renew')))
