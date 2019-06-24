// panel/index.js, this filename needs to match the one registered in package.json
Editor.Panel.extend({
  // css style for panel
  style: `
    :host { margin: 5px; }
    h2 { color: #f90; }
  `,

  // html template for panel
  template: `
    <h2>纹理压缩</h2>

    </div>
    <div style="width: 100%; height: 85%;margin: 0 0 0 0 ;">
    <h2 style="margin: 20 0 20 0">日志:</h2>
    <textarea class="flex-1 " id="logTextArea" v-model="logView"
              style="width: 100%; height: 100%; background: #252525;	resize: none; color: #fd942b;	border-color: #fd942b;"></textarea>
    </div>
  `,

  // element and variable binding
  $: {
    // btn: '#btn',
    textArea: '#logTextArea',
  },

  // method executed when template and styles are successfully loaded and initialized
  ready () {
    // this.$btn.addEventListener('confirm', () => {
    //   Editor.Ipc.sendToMain('packtexture:packtex');
    // });
  },

  // register your ipc messages here
  messages: {

    'packtexture:logmsg' (event, msg) {
      let time = new Date();
      msg = "[" + time.toLocaleString() + "]: " + msg + "\n";
      let content = this.$textArea.value;
      content += msg;
      this.$textArea.value = content;

      let textArea = this.$textArea;
      textArea.scrollTop = textArea.scrollHeight;
    },
  }
});