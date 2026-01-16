import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  /**
   * 关键点 1：
   * 使用相对路径，Flask static 最稳
   */
  base: "./",

  /**
   * 关键点 2：
   * build 输出到后端 static/
   */
  build: {
    outDir: path.resolve(__dirname, "../static"),
    emptyOutDir: true,          // 会清空 static 再输出
    assetsDir: "assets",        // 静态资源子目录
  },
});
