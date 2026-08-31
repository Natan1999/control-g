const encoder = new TextEncoder()

export function utf8(value: string) {
  return encoder.encode(value)
}

export function concatBytes(parts: Uint8Array[]) {
  const length = parts.reduce((total, part) => total + part.length, 0)
  const output = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xEDB88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})

function crc32(bytes: Uint8Array) {
  let crc = 0xFFFFFFFF
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function dosTimestamp(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = Math.max(1, date.getDate())
  const dosDate = ((Math.max(1980, date.getFullYear()) - 1980) << 9) | ((date.getMonth() + 1) << 5) | day
  return { time, date: dosDate }
}

/** Builds a standards-compliant ZIP using the store method (no compression). */
export function zipStored(files: Array<{ name: string; bytes: Uint8Array }>) {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0
  const timestamp = dosTimestamp()
  for (const file of files) {
    const name = utf8(file.name)
    const crc = crc32(file.bytes)
    const local = new Uint8Array(30 + name.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034B50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(10, timestamp.time, true)
    localView.setUint16(12, timestamp.date, true)
    localView.setUint32(14, crc, true)
    localView.setUint32(18, file.bytes.length, true)
    localView.setUint32(22, file.bytes.length, true)
    localView.setUint16(26, name.length, true)
    local.set(name, 30)
    localParts.push(local, file.bytes)

    const central = new Uint8Array(46 + name.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, 0x02014B50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(12, timestamp.time, true)
    centralView.setUint16(14, timestamp.date, true)
    centralView.setUint32(16, crc, true)
    centralView.setUint32(20, file.bytes.length, true)
    centralView.setUint32(24, file.bytes.length, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint32(42, offset, true)
    central.set(name, 46)
    centralParts.push(central)
    offset += local.length + file.bytes.length
  }
  const central = concatBytes(centralParts)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054B50, true)
  endView.setUint16(8, files.length, true)
  endView.setUint16(10, files.length, true)
  endView.setUint32(12, central.length, true)
  endView.setUint32(16, offset, true)
  return concatBytes([...localParts, central, end])
}
