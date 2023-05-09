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
console.log(ethers.utils.keccak256(ethers.utils.toUtf8Bytes('takeover')))

console.log('earth.838earth.bored')
let earth = ethers.utils.solidityKeccak256(
  ['bytes32', 'bytes32'],
  [ROOT, ethers.utils.keccak256(ethers.utils.toUtf8Bytes('bored'))],
)

earth = ethers.utils.solidityKeccak256(
  ['bytes32', 'bytes32'],
  [earth, ethers.utils.keccak256(ethers.utils.toUtf8Bytes('838earth'))],
)

earth = ethers.utils.solidityKeccak256(
  ['bytes32', 'bytes32'],
  [earth, ethers.utils.keccak256(ethers.utils.toUtf8Bytes('earth'))],
)

console.log(earth)
