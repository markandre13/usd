/**
 * ListOp is a value type representing an operation that edits a list.
 * It may append or prepend items, delete them, or replace the list entirely.
 *
 * SdfListOp maintains lists of items to be prepended, appended, deleted, or
 * used explicitly. If used in explicit mode, the ApplyOperations method replaces the given list
 * with the set explicit items. Otherwise, the ApplyOperations
 * method is used to apply the list-editing options in the input list in the
 * following order:
 * - Delete
 * - Prepend
 * - Append
 *
 * Lists are meant to contain unique values, and all list operations
 * will remove duplicates if encountered. Prepending items and using
 * explicit mode will preserve the position of the first of the duplicates
 * to be encountered, while appending items will preserve the last.
 *
 * see also pxr/usd/sdf/listOp.h
 */

export interface ListOp<T> {
    isExplicit?: boolean
    explicit?: T[]
    add?: T[]
    prepend?: T[]
    append?: T[]
    delete?: T[]
    order?: T[]
}
