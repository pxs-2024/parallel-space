import { useEffect, useState } from "react";

const useListenSpace = () => {
  const [spaceDown, setSpaceDown] = useState(false);
  // 键盘事件监听器
  useEffect(() => {
    /**
     * 键盘按下事件处理
     * @param e 键盘事件对象
     */
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault(); // 阻止默认的空格滚动行为
        setSpaceDown(true);
      }
    };

    /**
     * 键盘释放事件处理
     * @param e 键盘事件对象
     */
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };

    // 添加事件监听器
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);

    // 清理函数：组件卸载时移除事件监听器
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []); // 空依赖数组，只在组件挂载时执行一次
  return { spaceDown };
};

export { useListenSpace };