import _ from 'lodash';

// Working with array kind of input and expecting a boolean result
// E.g.
//    if (isMaybeArray(event.type, e => e.match(/Announce/))) { ... }
export function isMaybeArray(object,callback) {
    if (_.isArray(object)) {
        return _.find(object, e => callback(e) );
    }
    else {
        return callback(object);
    }
}