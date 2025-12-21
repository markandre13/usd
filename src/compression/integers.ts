// encode / decode int32
// int32: common value
// sequence of uint8 containing 4 Codes
// sequence of int8|int16|int32 as defined by the codes
// encoded values are the difference to the previous value
enum Code { Common, Int8, Int16, Int32 };

interface ARGE {
    input: number[],
    output: DataView,
    cur: number,
    commonValue: number,
    prevVal: number,
    codesOut: number,
    vintsOut: number
}

function encodeNHelper(N: number, arg: ARGE) {
    const getCode = (x: number) => {
        if (x === arg.commonValue) { return Code.Common }
        if (x >= -128 && x <= 127) { return Code.Int8 }
        if (x >= -32768 && x <= 32767) { return Code.Int16 }
        return Code.Int32
    }

    let codeByte = 0
    for (let i = 0; i != N; ++i) {
        let val = arg.input[arg.cur] - arg.prevVal
        arg.prevVal = arg.input[arg.cur++]
        const code = getCode(val)
        codeByte |= (code << (2 * i))
        switch (code) {
            default:
            case Code.Common:
                break
            case Code.Int8:
                arg.output.setInt8(arg.vintsOut, val)
                arg.vintsOut += 1
                break
            case Code.Int16:
                arg.output.setInt16(arg.vintsOut, val, true)
                arg.vintsOut += 2
                break
            case Code.Int32:
                arg.output.setInt32(arg.vintsOut, val, true)
                arg.vintsOut += 4
                break
        };
    }
    arg.output.setUint8(arg.codesOut, codeByte)
    ++arg.codesOut
}

export function encodeIntegers(input: number[], output: DataView) {
    if (input.length === 0) {
        return 0
    }

    // First find the most common element value.
    let commonValue = 0
    {
        let commonCount = 0
        const counts = new Map<number, number>()
        let prevVal = 0
        for (let cur = 0; cur < input.length; ++cur) {
            let val = input[cur] - prevVal
            let count = counts.get(val)
            if (count === undefined) {
                count = 1
            } else {
                ++count
            }
            counts.set(val, count)

            if (count > commonCount) {
                commonValue = val
                commonCount = count
            } else if (count == commonCount && val > commonValue) {
                // Take the largest common value in case of a tie -- this gives
                // the biggest potential savings in the encoded stream.
                commonValue = val
            }
            prevVal = input[cur]
        }
    }

    // Now code the values.

    // Write most common value.
    output.setInt32(0, commonValue, true)
    let numInts = input.length

    const arg: ARGE = {
        input,
        output,
        cur: 0,
        commonValue,
        prevVal: 0,
        codesOut: 4,
        vintsOut: Math.floor(4 + (input.length * 2 + 7) / 8)
    }

    while (numInts >= 4) {
        encodeNHelper(4, arg)
        numInts -= 4
    }
    switch (numInts) {
        case 0: default: break
        case 1: encodeNHelper(1, arg)
            break
        case 2: encodeNHelper(2, arg)
            break
        case 3: encodeNHelper(3, arg)
            break
    };
    return arg.vintsOut
}

interface ARGD {
    src: DataView
    result: number[]
    output: number
    codesIn: number
    vintsIn: number
    commonValue: number
    prevVal: number
}

function decodeNHelper(N: number, arg: ARGD) {
    const codeByte = arg.src.getUint8(arg.codesIn++)
    // console.log(`decodeNHelper(N=${N}): codeByte=${codeByte}`)
    for (let i = 0; i != N; ++i) {
        const x = (codeByte & (3 << (2 * i))) >> (2 * i)
        switch (x) {
            default:
            case Code.Common:
                arg.prevVal += arg.commonValue
                break
            case Code.Int8:
                arg.prevVal += arg.src.getInt8(arg.vintsIn)
                arg.vintsIn += 1
                break
            case Code.Int16:
                arg.prevVal += arg.src.getInt16(arg.vintsIn)
                arg.vintsIn += 2
                break
            case Code.Int32:
                arg.prevVal += arg.src.getInt32(arg.vintsIn)
                arg.vintsIn += 4
                break
        }
        arg.prevVal &= 0xffffffff
        arg.result[arg.output++] = arg.prevVal
    }
}

export function decodeIntegers(src: DataView, numInts: number): number[] {

    const commonValue = src.getInt32(0, true)

    const numCodesBytes = Math.floor((numInts * 2 + 7) / 8)
    let prevVal = 0
    let intsLeft = numInts

    const arg: ARGD = {
        src,
        result: new Array(numInts),
        output: 0,
        codesIn: 4,
        vintsIn: 4 + numCodesBytes,
        commonValue,
        prevVal
    }
    while (intsLeft >= 4) {
        decodeNHelper(4, arg)
        intsLeft -= 4
    }
    if (intsLeft > 0) {
        decodeNHelper(intsLeft, arg)
    }
    return arg.result
}
