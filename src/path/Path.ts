import type { PathType } from "./PathType.ts"

// OpenUSD has SdfPath and Sdf_PathNode

export class Node {
    private parent = 0
    private _children = new Array<number>()
    private _primChildren = new Set<string>
    private _path = new Path()
    private _elemPath = new Path()
}

function is_variantElementName(name: string) {
    return name[0] === '{'
}

export class Path {
    private _prim_part: string = ""; // e.g. /Model/MyMesh, MySphere
    private _prop_part: string = ""; // e.g. visibility (`.` is not included)
    private _variant_part: string = ""; // e.g. `variantColor` for {variantColor=green}
    private _variant_selection_part: string = ""; // e.g. `green` for {variantColor=green}

    // . Could be empty({variantColor=}).
    private _variant_part_str: string = ""; // str buffer for variant_part()
    _element: string = ""; // Element name
    private _path_type?: PathType // Currently optional.
    private _valid: boolean = false;

    constructor()
    constructor(prim: string, prop: string)
    constructor(prim?: string, prop?: string) {
        if (prim === undefined || prop === undefined) {
            this._valid = false
            return
        }
        this._update(prim, prop)
    }

    clone() { return new Path(this._prim_part, this._prop_part) }

    // this is SdfPath::AbsoluteRootPath() in OpenUSD
    static makeRootPath() { return new Path("/", "") }

    // Append prim or variantSelection path(change internal state)
    append_property(elem: string): Path {
        if (elem.length === 0) {
            this._valid = false
            return this
        }
        if (elem[0] === '{') {
            throw Error("TBD: variant chars are not supported yet.")
        }
        if (elem[0] === '[') {
            throw Error("TBD: relational attribute paths are not supported yet.")
        }
        if (elem[0] === '.') {
            throw Error("TBD: relative attribute paths are not supported yet.")
        }
        this._prop_part = elem
        this._element = elem
        return this
    }
    append_element(elem: string): Path {
        if (elem.length === 0) {
            this._valid = false
            return this
        }
        if (elem[0] === '{') {
            throw Error("TBD: variant chars are not supported yet.")
        }
        if (elem[0] === '[') {
            throw Error("TBD: relational attribute paths are not supported yet.")
        }
        if (elem[0] === '.') {
            throw Error("TBD: relative attribute paths are not supported yet.")
        }

        if ((this._prim_part.length == 1) && (this._prim_part[0] == '/')) {
            this._prim_part += elem
        } else {
            // TODO: Validate element name.
            this._prim_part += '/' + elem
        }

        this._element = elem
        return this

    }
    append_prim(elem: string): Path { return this.append_element(elem) } // for legacy

    // Const version. Does not change internal state.
    // clone path and append property
    AppendProperty(elem: string): Path {
        return this.clone().append_property(elem)
    }
    AppendPrim(elem: string): Path {
        return this.clone().append_prim(elem)
    }
    AppendElement(elem: string): Path {
        return this.clone().append_element(elem)
    }

    isValid() { return this._valid }
    // TODO: add test
    isEmpty() { return (this._prim_part.length === 0 && this._variant_part.length === 0 && this._prop_part.length === 0) }
    // TODO: add test
    getFullPathName() {
        let s = ""
        if (!this._valid) {
            s += "#INVALID#"
        }
        s += this._prim_part
        if (this._prop_part.length === 0) {
            return s
        }
        s = `${s}.${this._prop_part}`
        return s
    }
    prim_part() { return this._prim_part }
    prop_part() { return this._prop_part }

    private _update(p: string, prop: string) {
        if (p.length === 0 && prop.length === 0) {
            this._valid = false
            return
        }

        if (prop.length !== 0) {
            if (prop.indexOf("/") >= 0) {
                this._valid = false
                return
            }
            if (prop.at(0) === '.') {
                this._valid = false
                return
            }
        }

        // count the dots
        let ndots = 0
        for (let c of p) {
            if (c === '.') {
                ++ndots
            }
        }
        if (ndots > 1) {
            this._valid = false
            return
        }

        const prims = p.split('/')
        if (p[0] === '/') {
            // absolute path
            if (ndots === 0) {
                // absolute prim
                this._prim_part = p
                if (prop.length) {
                    this._prop_part = prop
                    this._element = prop
                } else {
                    if (prims.length) {
                        this._element = prims[prims.length - 1]
                    } else {
                        this._element = p
                    }
                }
                this._valid = true
            } else {
                // prim_part contains property name.
                if (prop.length) {
                    // prop must be empty.
                    this._valid = false
                    return
                }
                if (p.length < 3) {
                    // "/."
                    this._valid = false
                    return
                }
                const loc = p.indexOf(".")
                this._prop_part = p.substring(loc + 1)
                this._prim_part = p.substring(0, loc)
                this._element = this._prop_part
                this._valid = true
            }
        } else if (p[0] === '.') {
            this._prim_part = p
            if (prop.length) {
                this._prop_part = prop
                this._element = prop
            } else {
                if (prims.length) {
                    this._element = prims.at(prims.length - 1)!
                } else {
                    this._element = p
                }
            }
            this._valid = true
        } else {
            this._valid = false
            if (ndots === 0) {
                this._prim_part = p
                if (prop.length) {
                    this._prop_part = prop
                }
                this._valid = true
            } else {
                const loc = p.indexOf(".")
                const prop_name = p.substring(loc + 1)
                // TODO: check if not / in prop_name
                if (prop_name.indexOf('/') >= 0) {
                    this._valid = false
                    return
                }
                this._prim_part = p.substring(0, loc)
                this._prop_part = prop_name
                this._valid = true
            }
        }
    }
}
