import { protectedFetch } from "../core/server"

export const getUserData=async()=>{
    return protectedFetch(`/api/me`);
}