'use strict';
var fs = require('fs');
var zlib = require('zlib');
var crypto = require('crypto');
var sizeOf = require('image-size');

var child_process = require('child_process');
var execSync = child_process.execSync;
var exec = child_process.exec;

var pack = {
    
    readToolsEnv: function () {
        let packToolPath = Editor.projectPath + '/packages/packtexture/toolsEnv.json'
        if(!fs.existsSync(packToolPath)) {
            packToolPath = process.env.HOME + '/.CocosCreator/packages/packtexture/toolsEnv.json'
        }
        if(fs.existsSync(packToolPath)) {
            let toolPaths = fs.readFileSync(packToolPath);
            let toolEnv = JSON.parse(toolPaths);
            if(toolEnv instanceof Array && toolEnv.length > 0) {
                toolEnv.forEach(path => {
                    process.env.PATH += ':' + path;
                });
            } else {
                Editor.log('请输入正确的压缩工具路径, 确保toolsEnv.json文件是字符串数组格式..');
            }
        }
    },

    startPack: function () {
        //set env
        this.readToolsEnv();

        let buildPath = Editor.projectPath + "/build/jsb-default/";
        if (!fs.existsSync(buildPath)) {
            buildPath = Editor.projectPath + "/build/jsb-link/";
        }
        process.chdir(buildPath);
        this.buildPath = buildPath;
        let resPath = buildPath + "res";
        this.resPath = resPath;

        //define iOS res path.
        let resPathIOS = buildPath + "packResIOS/res";
        this.resConfigIOS = resPathIOS + "/pack.config";
        this.resRootPathIOS = buildPath + "packResIOS";

        //define android res path.
        let resPathAndroid = buildPath + "packResAndroid/res";
        this.resConfigAndroid = resPathAndroid + "/pack.config";
        this.resRootPathAndroid = buildPath + "packResAndroid";

        //create parent path.
        if (!fs.existsSync(this.resRootPathIOS)) {
            fs.mkdirSync(this.resRootPathIOS);
        }
        if (!fs.existsSync(this.resRootPathAndroid)) {
            fs.mkdirSync(this.resRootPathAndroid);
        }

        //read ios & android config
        if (fs.existsSync(this.resConfigIOS)) {
            let content = fs.readFileSync(this.resConfigIOS, 'UTF-8');
            this.packedIOSResConfig = JSON.parse(content);
        } else {
            this.packedIOSResConfig = {};
        }
        if (fs.existsSync(this.resConfigAndroid)) {
            let content = fs.readFileSync(this.resConfigAndroid, 'UTF-8');
            this.packedAndroidResConfig = JSON.parse(content);
        } else {
            this.packedAndroidResConfig = {};
        }
        this.srcfiles = [];

        //ios & android temp path.
        this.destIOSResPath = buildPath + "pack-temp-ios/res";
        this.destIOSResRoot = buildPath + "pack-temp-ios";

        this.destAndroidResPath = buildPath + "pack-temp-android/res";
        this.destAndroidResRoot = buildPath + "pack-temp-android";

        if (!fs.existsSync(this.destIOSResRoot)) {
            fs.mkdirSync(this.destIOSResRoot);
        }
        if (!fs.existsSync(this.destAndroidResRoot)) {
            fs.mkdirSync(this.destAndroidResRoot);
        }

        this.resIOSFileConfig = {};
        this.resAndroidFileConfig = {};
        this.copyDir(resPath, this.destIOSResPath, this.destAndroidResPath);

        this.packFiles(0);
    },

    /**
     * pvr 压缩.
     */
    packPVR: function (srcPath, sfile, dfile, callBack) {
        let outputPath = srcPath + '/out.pvr';
        let pvrshell = 'PVRTexToolCLI -i ' + sfile + ' -o ' + outputPath + ' -square + -pot + -q pvrtcbest -f PVRTC1_4,UBN,lRGB';
        exec(pvrshell, {
            encoding: 'utf8',
            env: process.env
        }, (err, stdout, stderr) => {
            let finish = true;
            if (fs.existsSync(outputPath)) {
                fs.createReadStream(outputPath)
                    .pipe(zlib.createGzip())
                    .pipe(fs.createWriteStream(dfile));
                fs.unlink(outputPath);
            } else {
                Editor.log('压缩PVR失败:' + err);
                fs.writeFileSync(dfile, buffer);
                finish = false;
            }
            if (callBack) {
                callBack(finish, dfile);
            }
        });
    },

    /**
     * ETC1 压缩 带alpha通道.
     */
    packETCAplha: function (srcPath, sfile, dfile, callBack, dfile2) {
        let packTemp = sfile.replace(/\.[^/.]+$/, "");
        let outputPath = packTemp + '.pkm';
        let shell = 'etcpack ' + sfile + ' ' + srcPath + ' -c etc -aa';
        exec(shell, {
            encoding: 'utf8',
            env: process.env
        }, (err, stdout, stderr) => {
            let finish = true;
            if (fs.existsSync(outputPath)) {
                fs.createReadStream(outputPath)
                    .pipe(zlib.createGzip())
                    .pipe(fs.createWriteStream(dfile));
                if (dfile2) {
                    fs.createReadStream(outputPath)
                        .pipe(zlib.createGzip())
                        .pipe(fs.createWriteStream(dfile2));
                }
                fs.unlink(outputPath);
            } else {
                finish = false;
                let buffer = fs.readFileSync(sfile);
                fs.writeFileSync(dfile, buffer);
                Editor.log('ETC压缩失败, ' + sfile);
            }
            if (callBack) {
                callBack(finish, dfile);
            }
        });
    },

    /**
     * ETC2 压缩.
     */
    packETC2: function (srcPath, sfile, dfile, callBack, dfile2) {
        let packTemp = sfile.replace(/\.[^/.]+$/, "");
        let outputPath = packTemp + '.pkm';
        let shell = 'etcpack ' + sfile + ' ' + srcPath + ' -c etc2 -f RGBA';
        exec(shell, {
            encoding: 'utf8',
            env: process.env
        }, (err, stdout, stderr) => {
            let finish = true;
            if (fs.existsSync(outputPath)) {
                fs.createReadStream(outputPath)
                    .pipe(zlib.createGzip())
                    .pipe(fs.createWriteStream(dfile));
                if (dfile2) {
                    fs.createReadStream(outputPath)
                        .pipe(zlib.createGzip())
                        .pipe(fs.createWriteStream(dfile2));
                }
                fs.unlink(outputPath);
            } else {
                finish = false;
                let buffer = fs.readFileSync(sfile);
                fs.writeFileSync(dfile, buffer);
                Editor.log('ETC2压缩失败, ' + sfile);
            }
            if (callBack) {
                callBack(finish, dfile);
            }
        });
    },

    /**
     * 拷贝文件.
     */
    copyFile: function (sfile, dfile, callBack) {
        if (fs.existsSync(dfile)) {
            fs.unlink(dfile);
        }
        fs.readFile(sfile, (err, buffer) => {
            let finish = true;
            if (err) {
                Editor.log('读文件失败: ' + err);
                finish = false;
                if (callBack) {
                    callBack(finish, null);
                }
            } else {
                fs.writeFile(dfile, buffer, (err) => {
                    if (err) {
                        finish = false;
                        Editor.log('写文件失败: ' + err);
                    }
                    if (callBack) {
                        callBack(finish, dfile);
                    }
                });
            }
        });
    },

    /**
     * 压缩android 资源
     */
    packAndroidRes: function (src, name, sfile, dfileAndroid, md5, key, callBack) {
        let packedMD5Android = this.packedAndroidResConfig[key];
        let packedAPath = sfile.replace('\/res\/', '/packResAndroid/res/');
        if (packedMD5Android === md5 && fs.existsSync(packedAPath)) {
            this.copyFile(packedAPath, dfileAndroid, (finish, dest) => {
                if (finish) {
                    Editor.log('Android纹理未修改 ' + name);
                    if (callBack) {
                        callBack(true, dfileAndroid);
                    }
                } else {
                    Editor.log('Android拷贝文件失败!!!  ' + packedAPath);
                    if (callBack) {
                        callBack(false, null);
                    }
                }
            });
        } else {
            Editor.log('开始压缩[ETC1]  ' + name + ", md5:" + md5);
            this.packETCAplha(src, sfile, dfileAndroid, (finish, dest) => {
                if(finish) {
                    Editor.log('压缩完成 ' + name);
                    if(callBack) {
                        callBack(true, dfileAndroid);
                    }
                } else {
                    Editor.log('ETC1压缩失败!!! ' + sfile);
                    let buffer = fs.readFileSync(sfile);
                    fs.writeFileSync(dfileAndroid, buffer);
                    if(callBack) {
                        callBack(false, null);
                    }
                }
            });
        }

    },

    packFiles: function (index) {
        let self = this;
        if (this.srcfiles.length > index) {
            let packfile = this.srcfiles[index];
            let src = packfile.sourcePath;
            let sfile = packfile.source;
            let dfileIOS = packfile.destinationIOS;
            let dfileAndroid = packfile.destinationAndroid;
            let path = packfile.name;
            let buffer = fs.readFileSync(sfile);
            var dimensions = sizeOf(sfile);
            let w = dimensions.width;
            let h = dimensions.height;

            let key = sfile.replace(Editor.projectPath, '');

            let fsHash = crypto.createHash('md5');
            fsHash.update(buffer);
            let md5 = fsHash.digest('hex');
            Editor.log('checking  ' + path + ", md5:" + md5);
            let self = this;
            let packedMD5IOS = this.packedIOSResConfig[key];
            let packedPath = sfile.replace('\/res\/', '/packResIOS/res/');
            if (md5 === packedMD5IOS && fs.existsSync(packedPath)) {
                //图片未修改，直接用原来已经压缩好的资源.
                this.copyFile(packedPath, dfileIOS, (finish, dest) => {
                    if (finish) {
                        self.resIOSFileConfig[key] = md5;
                        Editor.log('iOS 纹理未修改 ' + path);
                        //压缩Android端的纹理
                        self.packAndroidRes(src, path, sfile, dfileAndroid, md5, key, (finish, dest) => {
                            if (finish) {
                                self.resAndroidFileConfig[key] = md5;
                            }
                            process.nextTick(() => self.packFiles(++index));
                        });
                    } else {
                        Editor.log('拷贝文件失败!!!  ' + packedPath);
                    }
                });
            } else if (w > 0 && w == h && ((w & (w - 1)) == 0)) {
                Editor.log('图片宽度：' + w + ' 图片高度：' + h);
                Editor.log('开始压缩图片[PVRTC] ' + path);
                //正方形开始且是2的n次幂，用pvr压缩纹理.
                this.packPVR(src, sfile, dfileIOS, (finish, dest) => {
                    if (finish) {
                        Editor.log('压缩完成');
                        self.resIOSFileConfig[key] = md5;
                        //压缩Android端纹理
                        self.packAndroidRes(src, path, sfile, dfileAndroid, md5, key, (finish, dest) => {
                            if (finish) {
                                self.resAndroidFileConfig[key] = md5;
                                process.nextTick(() => self.packFiles(++index));
                            }
                        });
                    } else {
                        Editor.log('压缩失败!!! ' + sfile);
                    }
                });

            } else {
                //文件有修改, 调用压缩纹理
                Editor.log('图片宽度：' + w + ' 图片高度：' + h);
                Editor.log('开始压缩[ETC2]  ' + path + ", md5:" + md5);
                this.packETC2(src, sfile, dfileIOS, (finish, dest) => {
                    if (finish) {
                        Editor.log('压缩完成 ');
                        self.resIOSFileConfig[key] = md5;
                        self.resAndroidFileConfig[key] = md5;
                        self.packAndroidRes(src, path, sfile, dfileAndroid, md5, key, (finish, dest) => {
                            if (finish) {
                                self.resAndroidFileConfig[key] = md5;
                                process.nextTick(() => self.packFiles(++index));
                            }
                        });
                        /*self.packFiles(++index);*/
                    } else {
                        Editor.log('压缩失败!!! ' + sfile);
                        process.nextTick(() => self.packFiles(++index));
                    }
                }, '');
            }
        } else {
            this.finishPack();
        }
    },

    finishPack: function () {
        Editor.log('写入配置...');
        //写入android 配置
        let iOSConfig = JSON.stringify(this.resIOSFileConfig);
        let iOSConfigPath = this.destIOSResPath + '/pack.config';
        fs.writeFileSync(iOSConfigPath, iOSConfig, 'utf8');

        execSync('rm -fr ' + this.resRootPathIOS);
        execSync('mv ' + this.destIOSResRoot + ' ' + this.resRootPathIOS);

        //写入ios配置.
        let androidConfig = JSON.stringify(this.resAndroidFileConfig);
        let androidConfigPath = this.destAndroidResPath + '/pack.config';
        fs.writeFileSync(androidConfigPath, androidConfig, 'utf8');

        execSync('rm -fr ' + this.resRootPathAndroid);
        execSync('mv ' + this.destAndroidResRoot + ' ' + this.resRootPathAndroid);

        var date = new Date();
        Editor.log('纹理压缩完成! [' + date.toLocaleDateString() + ' ' + date.toLocaleTimeString() + ']');
    },

    copyDir: function (srcDir, destIOSDir, destAndroidDir) {
        if (!fs.existsSync(destIOSDir)) {
            fs.mkdirSync(destIOSDir);
        }
        if (!fs.existsSync(destAndroidDir)) {
            fs.mkdirSync(destAndroidDir);
        }
        this.copyFiles(srcDir, destIOSDir, destAndroidDir);
    },

    copyFiles: function (src, destIOSDir, destAndroidDir) {
        let self = this;
        let paths = fs.readdirSync(src);
        paths.forEach((path) => {
            let sfile = src + '/' + path;
            let dfileIOS = destIOSDir + '/' + path;
            let dfileAndroid = destAndroidDir + '/' + path;
            let stat = fs.statSync(sfile);
            if (stat.isFile() && self.isFileNeedPack(path, sfile)) {
                let packfile = {
                    source: sfile,
                    destinationIOS: dfileIOS,
                    destinationAndroid: dfileAndroid,
                    sourcePath: src,
                    name: path
                };
                this.srcfiles.push(packfile);
            } else if (stat.isDirectory()) {
                self.copyDir(sfile, dfileIOS, dfileAndroid);
            } else {
                let buffer = fs.readFileSync(sfile);
                fs.writeFileSync(dfileIOS, buffer);
                fs.writeFileSync(dfileAndroid, buffer);
            }
        });
    },

    //文件是否要压缩.
    isFileNeedPack: function (filename, fullPath) {
        if (filename.indexOf('.png') != -1 ||
            filename.indexOf('.jpg') != -1) {
                return true;
        }
        return false;
    }
}

module.exports = pack;