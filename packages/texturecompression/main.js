'use strict';
var texPacker = require('./pack');

var packerOpened = true;
module.exports = {
  load() {
    // execute when package loaded
  },

  unload() {
    // execute when package unloaded
  },

  // register your ipc messages here
  messages: {
    'open'() {
      // open entry panel registered in package.json
      // Editor.Panel.open('packtexture');
    },
    'packtexture:opentexturepack'() {
      packerOpened = true;
      Editor.log('纹理压缩已开启');
    },

    'packtexture:closetexturepack'() {
      packerOpened = false;
      Editor.log('纹理压缩已关闭');
    },
    //编译完成回调.
    'editor:build-finished': function (event, target) {
      if (packerOpened) {
        Editor.log('开始压缩纹理...');
        texPacker.startPack();
      } else {
        Editor.log('纹理压缩已关闭，不进行纹理压缩。');
      }
    },

    //开始打包texture.
    'packtex'() {

    },
  },
};