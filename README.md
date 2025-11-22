# USD Subset for makehuman.js

### USD Terminology

* Prims (Primitive)
  * node with parent & children
  * have types like Xform, Mesh, Scope, Material, ...
  * have properties
    * attributes
    * relationships, which point to other Prims or Properties
  Path
Layer


Encoding

```
TOC
  size: uint64
  {
    name: char[16]
    start: uint64
    end: uint64
  }
  
TOKENS -> string[]
  num_tokens: uint64
  uncompressed_size: uint64
  compressed_size: uint64
  decompressFromBuffer() ;; chunks of LZ4 blocks; 0 terminated strings

STRINGS -> index[] ;; pointer into tokens
  num_strings: uint64
  uint32[num_strings]
  
FIELDS -> Field{index, ValueRep{8 bytes}}[]
  numFields: uint64
  indices := readCompressedInts()
  
  reps_size: uint64
  decompressFromBuffer() ;; 8 byte blocks
  
FIELDSETS: int[] ;; sequences of field indices, separated by -1
  numFieldSets: uint64
  fset_size: uint64
  compressedInts
  
PATHS: node tree

SPECS: Spec { path_index, fieldset_index, spec_type }
```
