import {crc32,deflateRawSync} from 'node:zlib';
// One UTF-8 named file, standard ZIP32/DEFLATE, no platform tools required.
export function soloZip(name,contents){
 const filename=Buffer.from(name,'utf8'),bytes=Buffer.from(contents),packed=deflateRawSync(bytes),crc=crc32(bytes);
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(8,8);local.writeUInt16LE(33,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(bytes.length,22);local.writeUInt16LE(filename.length,26);
 const entry=Buffer.concat([local,filename,packed]),central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt16LE(8,10);central.writeUInt16LE(33,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(packed.length,20);central.writeUInt32LE(bytes.length,24);central.writeUInt16LE(filename.length,28);
 const directory=Buffer.concat([central,filename]),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(entry.length,16);
 return Buffer.concat([entry,directory,end]);
}
