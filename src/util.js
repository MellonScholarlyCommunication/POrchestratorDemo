import _ from 'lodash';

// Returns a true value when all object matches a callback truth
// The object can be an array, hash or string
export function hasAll(object,callback) {
    if (object === undefined) {
        return undefined;
    }
    else if (_.isArray(object)) {
        const result = _.find(object, e => callback(e) );
        return result.length == object.length;   
    }
    else {
        return callback(object);
    }
}

// Returns a true value when one ore more object matches a callback truth
// The object can be an array, hash or string
export function hasAny(object,callback) {
    if (object === undefined) {
        return undefined;
    }
    else if (_.isArray(object)) {
        const result = _.find(object, e => callback(e) );
        return result.length > 0;   
    }
    else {
        return callback(object);
    }
}

// Maps a function on all objects:
// The object can be an array, hash or string
export function mapAll(object,callback) {
    if (object === undefined) {
        return undefined;
    }
    else if (_.isArray(object)) {
        return _.map(object, e => callback(e));
    }
    else {
        return [ callback(object) ];
    }
}