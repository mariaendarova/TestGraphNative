exports.merge = function (sourceExports, destExports) {
    for (var key in sourceExports) {
        destExports[key] = sourceExports[key];
    }
};
//# sourceMappingURL=module-merge.js.map
