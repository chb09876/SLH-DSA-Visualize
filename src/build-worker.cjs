const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const dir=__dirname;
function instrument(source){
 const inject=(needle,replacement,count=1)=>{const hits=source.split(needle).length-1;if(hits!==count)throw Error('Trace patch mismatch: '+needle.slice(0,90)+' ('+hits+')');source=source.replaceAll(needle,replacement);};
 source='const __trace=(type,data)=>globalThis.__SLH_TRACE__?.(type,data);\n'+source;
 inject('return { tree, leafIdx, md };',"__trace('digest',{R,digest,md,tree,leafIdx});\n        return { tree, leafIdx, md };");
 // Keep every XMSS node. For large FORS trees, keep the displayed top three
 // levels and the complete selected/authentication paths instead of all leaves.
 inject('const rawContext = context;\n        const leafFn = fn;',`const rawContext = context;
        const __kind=treeAddr[OFFSET_TYPE]===AddressType.HASHTREE?'xmss':'fors';
        const __tree=__kind==='fors'?Math.floor(idxOffset/2**A):0;
        const __retain=(h,i)=>__kind==='xmss'||h>=height-3||i===(leafIdx>>>h)||i===((leafIdx>>>h)^1);
        const __node=(h,i,value)=>{if(__retain(h,i))__trace('treeNode',{kind:__kind,tree:__tree,layer:treeAddr[OFFSET_LAYER],height:h,index:i,value,source:'computed'});};
        const leafFn = fn;`);
 inject('cur1.set(leafFn(leafIdx, addrOffset, rawContext, info));','cur1.set(leafFn(leafIdx, addrOffset, rawContext, info));\n            __node(0,idx,cur1);');
 inject('cur1.set(rawContext.thashN(2, current, treeAddr));','cur1.set(rawContext.thashN(2, current, treeAddr));\n                __node(h+1,i>>1,cur1);');
 const computeStart=source.indexOf('    const computeRoot = '),computeEnd=source.indexOf('    const seedCoder = ',computeStart);
 let compute=source.slice(computeStart,computeEnd);
 compute=compute.replace('const rawContext = context;',`const rawContext = context;
        const __kind=addr[OFFSET_TYPE]===AddressType.HASHTREE?'xmss':'fors',__tree=__kind==='fors'?Math.floor(idxOffset/2**A):0;
        const __node=(height,index,value,source='computed')=>__trace('treeNode',{kind:__kind,tree:__tree,layer:addr[OFFSET_LAYER],height,index,value,source});
        __node(0,leafIdx,leaf);
        for(let h=0;h<treeHeight;h++)__node(h,(leafIdx>>>h)^1,authPath.subarray(h*N,(h+1)*N),'auth');
        const __nodeHash=(input,address)=>{
            const value=rawContext.thashN(2,input,address),height=address[OFFSET_CHAIN_ADDR];
            let index=0;for(let k=0;k<4;k++)index=index*256+address[OFFSET_TREE_INDEX+k];
            __node(height,index-(__kind==='fors'?__tree*2**(A-height):0),value);return value;
        };`);
 const nodeHashNeedle='rawContext.thashN(2, buffer, addr)';
 if(compute.split(nodeHashNeedle).length-1!==3)throw Error('computeRoot node observation mismatch');
 compute=compute.replaceAll(nodeHashNeedle,'__nodeHash(buffer,addr)');
 source=source.slice(0,computeStart)+compute+source.slice(computeEnd);
 inject('for (let k = 0;; k++) {',"for (let k = 0;; k++) {\n                if (wotsKmask === 0 || (leafIdx === (~0 >>> 0) && addrOffset === 0)) __trace('chainNode',{layer:info.leafAddr[OFFSET_LAYER],leaf:addrOffset,chain:i,step:k,value:pk});");
 inject('return rawContext.thashN(WOTS_LEN, wotsPk, info.pkAddr);',"if (leafIdx === (~0 >>> 0) && addrOffset % Math.max(1,(1 << TREE_HEIGHT)/16) === 0) __trace('keygenProgress',{completed:addrOffset+1,total:1 << TREE_HEIGHT});\n        return rawContext.thashN(WOTS_LEN, wotsPk, info.pkAddr);");
 inject('const publicKey = publicCoder.encode([publicSeed, root]);',"__trace('keygenResult',{root,publicSeed});\n            const publicKey = publicCoder.encode([publicSeed, root]);");
 inject('roots.push(root);\n                fors.push([prf, authPath]);',"__trace('forsTree',{tree:i,index:indices[i],root,secret:prf,auth:authPath});\n                roots.push(root);\n                fors.push([prf, authPath]);");
 inject('const root = copyBytes(context.thashN(K, concatBytes(...roots), forsPkAddr));',"const root = copyBytes(context.thashN(K, concatBytes(...roots), forsPkAddr));\n            __trace('forsPk',{value:root});");
 inject('const { sigWots, sigAuth, root: r, } = merkleSign(context, wotsAddr, treeAddr, leafIdx, root);',"__trace('xmssInput',{layer:i,tree,leafIdx,message:root});\n                const { sigWots, sigAuth, root: r, } = merkleSign(context, wotsAddr, treeAddr, leafIdx, root);\n                __trace('xmssResult',{layer:i,tree,leafIdx,root:r,signature:sigWots,auth:sigAuth});");
 inject('roots.push(copyBytes(computeRoot(leaf, indices[i], idxOffset, authPath, A, context, forsTreeAddr)));',"const leafCopy=copyBytes(leaf);\n                const restored=copyBytes(computeRoot(leaf, indices[i], idxOffset, authPath, A, context, forsTreeAddr));\n                __trace('forsTree',{tree:i,index:indices[i],root:restored,secret:prf,leaf:leafCopy,auth:authPath});\n                roots.push(restored);");
 inject('let root = copyBytes(context.thashN(K, concatBytes(...roots), forsPkAddr));',"let root = copyBytes(context.thashN(K, concatBytes(...roots), forsPkAddr));\n            __trace('forsPk',{value:root});");
 inject('const lengths = chainLengths(root);',"__trace('xmssInput',{layer:i,tree,leafIdx,message:root,signature:wots,auth:sigAuth});\n                const lengths = chainLengths(root);");
 inject('out.set(wots.subarray(i * N, (i + 1) * N));',"out.set(wots.subarray(i * N, (i + 1) * N));\n                    __trace('chainNode',{layer:treeAddr[OFFSET_LAYER],chain:i,step:start,value:out.subarray(0,N)});");
 inject('out.set(context.thash1(out, wotsAddr));',"out.set(context.thash1(out, wotsAddr));\n                        __trace('chainNode',{layer:treeAddr[OFFSET_LAYER],chain:i,step:j+1,value:out.subarray(0,N)});");
 inject('root = copyBytes(computeRoot(leaf, leafIdx, 0, sigAuth, TREE_HEIGHT, context, treeAddr));',"root = copyBytes(computeRoot(leaf, leafIdx, 0, sigAuth, TREE_HEIGHT, context, treeAddr));\n                __trace('xmssResult',{layer:i,tree,leafIdx,root,signature:wots,auth:sigAuth});");
 inject('return equalBytes(root, pubRoot);',"__trace('rootComparison',{recovered:root,expected:pubRoot,valid:equalBytes(root,pubRoot)});\n            return equalBytes(root, pubRoot);");
 return source;
}
async function build(){await esbuild.build({entryPoints:[path.join(dir,'worker.js')],bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true,legalComments:'inline',outfile:path.join(dir,'worker-bundle.js'),plugins:[{name:'slh-trace',setup(build){build.onLoad({filter:/[\\/]@noble[\\/]post-quantum[\\/]slh-dsa\.js$/},args=>({contents:instrument(fs.readFileSync(args.path,'utf8')),loader:'js',resolveDir:path.dirname(args.path)}));}}]});console.log('Worker bundled',fs.statSync(path.join(dir,'worker-bundle.js')).size);}
if(require.main===module)build().catch(e=>{console.error(e);process.exit(1)});
module.exports={instrument,build};
