export default function deepCopy<T>(obj: T): T {
    // Handle the case where obj is null or not an object
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    // Create a deep copy using JSON.parse and JSON.stringify
    return JSON.parse(JSON.stringify(obj));
}
