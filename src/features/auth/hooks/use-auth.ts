import { useAuthContext } from "../context/auth-provider";

/**
 * 当前用户信息，由根 layout 服务端 getAuth() 注入 AuthProvider，不再在客户端按路由重复请求。
 */
const useAuth = () => useAuthContext();

export { useAuth };
