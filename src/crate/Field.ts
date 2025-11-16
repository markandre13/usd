import type { TokenIndex } from "../index.ts"
import type { ValueRep } from "./ValueRep.ts"

export class Field {
    tokenIndex: TokenIndex
    valueRep: ValueRep
    constructor(tokenIndex: number, valueRep: ValueRep) {
        this.tokenIndex = tokenIndex
        this.valueRep = valueRep
    }
    toString(tokens?: string[]) {
        return `{ token_index = ${this.tokenIndex} ${tokens ? ` (${tokens[this.tokenIndex]})` : ''}}, value_rep=${this.valueRep} }`
    }
}
