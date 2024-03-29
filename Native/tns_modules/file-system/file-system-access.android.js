var appModule = require("application/application");
var textModule = require("text/text");

var FileSystemAccess = (function () {
    function FileSystemAccess() {
        this._pathSeparator = java.io.File.separator.toString();
    }
    FileSystemAccess.prototype.getLastModified = function (path) {
        var javaFile = new java.io.File(path);
        return new Date(javaFile.lastModified());
    };

    FileSystemAccess.prototype.getParent = function (path, onError) {
        try  {
            var javaFile = new java.io.File(path);
            var parent = javaFile.getParentFile();

            return { path: parent.getAbsolutePath(), name: parent.getName() };
        } catch (exception) {
            if (onError) {
                onError(exception);
            }

            return undefined;
        }
    };

    FileSystemAccess.prototype.getFile = function (path, onError) {
        return this.ensureFile(new java.io.File(path), false, onError);
    };

    FileSystemAccess.prototype.getFolder = function (path, onError) {
        var javaFile = new java.io.File(path);
        var dirInfo = this.ensureFile(javaFile, true, onError);
        if (!dirInfo) {
            return undefined;
        }

        return { path: dirInfo.path, name: dirInfo.name };
    };

    FileSystemAccess.prototype.eachEntity = function (path, onEntity, onError) {
        if (!onEntity) {
            return;
        }

        this.enumEntities(path, onEntity, onError);
    };

    FileSystemAccess.prototype.getEntities = function (path, onSuccess, onError) {
        if (!onSuccess) {
            return;
        }

        var fileInfos = new Array();
        var onEntity = function (entity) {
            fileInfos.push(entity);
            return true;
        };

        var errorOccurred;
        var localError = function (error) {
            if (onError) {
                onError(error);
            }

            errorOccurred = true;
        };

        this.enumEntities(path, onEntity, localError);

        if (!errorOccurred) {
            onSuccess(fileInfos);
        }
    };

    FileSystemAccess.prototype.fileExists = function (path) {
        var file = new java.io.File(path);
        return file.exists();
    };

    FileSystemAccess.prototype.folderExists = function (path) {
        var file = new java.io.File(path);
        var exists = file.exists();
        var dir = file.isDirectory();
        var isFile = file.isFile();
        var hidden = file.isHidden();

        return exists && dir;
    };

    FileSystemAccess.prototype.deleteFile = function (path, onSuccess, onError) {
        try  {
            var javaFile = new java.io.File(path);
            if (!javaFile.isFile()) {
                if (onError) {
                    onError({ message: "The specified parameter is not a File entity." });
                }

                return;
            }

            if (!javaFile.delete()) {
                if (onError) {
                    onError({ message: "File deletion failed" });
                }
            } else if (onSuccess) {
                onSuccess();
            }
        } catch (exception) {
            if (onError) {
                onError(exception);
            }
        }
    };

    FileSystemAccess.prototype.deleteFolder = function (path, isKnown, onSuccess, onError) {
        try  {
            var javaFile = new java.io.File(path);
            if (!javaFile.getCanonicalFile().isDirectory()) {
                if (onError) {
                    onError({ message: "The specified parameter is not a Folder entity." });
                }

                return;
            }

            this.deleteFolderContent(javaFile);

            if (!isKnown) {
                if (javaFile.delete()) {
                    if (onSuccess) {
                        onSuccess();
                    }
                } else {
                    if (onError) {
                        onError({ message: "Folder deletion failed." });
                    }
                }
            } else {
            }
        } catch (exception) {
            if (onError) {
                onError(exception);
            }
        }
    };

    FileSystemAccess.prototype.emptyFolder = function (path, onSuccess, onError) {
        try  {
            var javaFile = new java.io.File(path);
            if (!javaFile.getCanonicalFile().isDirectory()) {
                if (onError) {
                    onError({ message: "The specified parameter is not a Folder entity." });
                }

                return;
            }

            this.deleteFolderContent(javaFile);

            if (onSuccess) {
                onSuccess();
            }
        } catch (exception) {
            if (onError) {
                onError(exception);
            }
        }
    };

    FileSystemAccess.prototype.rename = function (path, newPath, onSuccess, onError) {
        var javaFile = new java.io.File(path);
        if (!javaFile.exists()) {
            if (onError) {
                onError(new Error("The file to rename does not exist"));
            }

            return;
        }

        var newFile = new java.io.File(newPath);
        if (newFile.exists()) {
            if (onError) {
                onError(new Error("A file with the same name already exists."));
            }

            return;
        }

        if (!javaFile.renameTo(newFile)) {
            if (onError) {
                onError(new Error("Failed to rename file '" + path + "' to '" + newPath + "'"));
            }

            return;
        }

        if (onSuccess) {
            onSuccess();
        }
    };

    FileSystemAccess.prototype.getDocumentsFolderPath = function () {
        var context = appModule.android.context;
        var dir = context.getFilesDir();
        return dir.getAbsolutePath();
    };

    FileSystemAccess.prototype.getTempFolderPath = function () {
        var context = appModule.android.context;
        var dir = context.getCacheDir();
        return dir.getAbsolutePath();
    };

    FileSystemAccess.prototype.readText = function (path, onSuccess, onError, encoding) {
        try  {
            var javaFile = new java.io.File(path);
            var stream = new java.io.FileInputStream(javaFile);

            var actualEncoding = encoding;
            if (!actualEncoding) {
                actualEncoding = textModule.encoding.UTF_8;
            }
            var reader = new java.io.InputStreamReader(stream, actualEncoding);
            var bufferedReader = new java.io.BufferedReader(reader);

            var line = undefined;
            var result = "";
            while (true) {
                line = bufferedReader.readLine();
                if (!line) {
                    break;
                }

                if (result.length > 0) {
                    result += "\n";
                }

                result += line;
            }

            bufferedReader.close();

            if (onSuccess) {
                onSuccess(result);
            }
        } catch (exception) {
            if (onError) {
                onError(exception);
            }
        }
    };

    FileSystemAccess.prototype.writeText = function (path, content, onSuccess, onError, encoding) {
        try  {
            var javaFile = new java.io.File(path);
            var stream = new java.io.FileOutputStream(javaFile);

            var actualEncoding = encoding;
            if (!actualEncoding) {
                actualEncoding = textModule.encoding.UTF_8;
            }
            var writer = new java.io.OutputStreamWriter(stream, actualEncoding);

            writer.write(content);
            writer.close();

            if (onSuccess) {
                onSuccess();
            }
        } catch (exception) {
            if (onError) {
                onError(exception);
            }
        }
    };

    FileSystemAccess.prototype.deleteFolderContent = function (file) {
        var filesList = file.listFiles();

        var i, childFile, success = false;

        for (i = 0; i < filesList.length; i++) {
            childFile = filesList[i];
            if (childFile.getCanonicalFile().isDirectory()) {
                success = this.deleteFolderContent(childFile);
                if (!success) {
                    break;
                }
            }

            success = childFile.delete();
        }

        return success;
    };

    FileSystemAccess.prototype.ensureFile = function (javaFile, isFolder, onError) {
        try  {
            if (!javaFile.exists()) {
                var created;
                if (isFolder) {
                    created = javaFile.mkdirs();
                } else {
                    created = javaFile.createNewFile();
                }

                if (!created) {
                    if (onError) {
                        onError("Failed to create new java File for path " + javaFile.getAbsolutePath());
                    }

                    return undefined;
                } else {
                    javaFile.setReadable(true);
                    javaFile.setWritable(true);
                }
            }

            var path = javaFile.getAbsolutePath();
            return { path: path, name: javaFile.getName(), extension: this.getFileExtension(path) };
        } catch (exception) {
            if (onError) {
                onError(exception);
            }

            return undefined;
        }
    };

    FileSystemAccess.prototype.getFileExtension = function (path) {
        var dotIndex = path.lastIndexOf(".");
        if (dotIndex && dotIndex >= 0 && dotIndex < path.length) {
            return path.substring(dotIndex);
        }

        return "";
    };

    FileSystemAccess.prototype.enumEntities = function (path, callback, onError) {
        try  {
            var javaFile = new java.io.File(path);
            if (!javaFile.getCanonicalFile().isDirectory()) {
                if (onError) {
                    onError("There is no folder existing at path " + path);
                }

                return;
            }

            var filesList = javaFile.listFiles();
            var length = filesList.length, i, filePath, info, retVal;

            for (i = 0; i < length; i++) {
                javaFile = filesList[i];

                info = {
                    path: javaFile.getAbsolutePath(),
                    name: javaFile.getName()
                };

                if (javaFile.isFile()) {
                    info.extension = this.getFileExtension(info.path);
                }

                retVal = callback(info);
                if (retVal === false) {
                    break;
                }
            }
        } catch (exception) {
            if (onError) {
                onError(exception);
            }
        }
    };

    FileSystemAccess.prototype.getPathSeparator = function () {
        return this._pathSeparator;
    };

    FileSystemAccess.prototype.normalizePath = function (path) {
        var file = new java.io.File(path);
        return file.getAbsolutePath();
    };

    FileSystemAccess.prototype.joinPath = function (left, right) {
        var file1 = new java.io.File(left);
        var file2 = new java.io.File(file1, right);

        return file2.getAbsolutePath();
    };

    FileSystemAccess.prototype.joinPaths = function (paths) {
        if (!paths || paths.length === 0) {
            return "";
        }

        if (paths.length === 1) {
            return paths[0];
        }

        var i, result = paths[0];
        for (i = 1; i < paths.length; i++) {
            result = this.joinPath(result, paths[i]);
        }

        return this.normalizePath(result);
    };
    return FileSystemAccess;
})();
exports.FileSystemAccess = FileSystemAccess;
//# sourceMappingURL=file-system-access.android.js.map
