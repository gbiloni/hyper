"use server";

import pool from "@/lib/db";
import { cookies } from "next/headers";

export async function syncNodeName(sysName: string) {
  try {
    const cookieStore = await cookies();
    const nodeIdStr = cookieStore.get("hyperisp_active_node_id")?.value;
    const nodeNameStr = cookieStore.get("hyperisp_active_node_name")?.value;

    if (!nodeIdStr || !nodeNameStr || !sysName) {
      return { success: false, message: "Missing node info in cookies or sysName" };
    }

    const nodeId = parseInt(nodeIdStr, 10);
    const nodeName = decodeURIComponent(nodeNameStr);

    if (nodeName !== sysName) {
      console.log(`[SYNC NODE NAME] Updating node ${nodeId} name from '${nodeName}' to '${sysName}'`);
      await pool.query('UPDATE nodo SET nombre = ? WHERE id = ?', [sysName, nodeId]);
      
      // Update the cookie so it's consistent if the user refreshes
      cookieStore.set("hyperisp_active_node_name", encodeURIComponent(sysName), { path: "/" });
      
      return { success: true, updated: true, newName: sysName };
    }

    return { success: true, updated: false };
  } catch (error: any) {
    console.error("[SYNC NODE NAME] Error updating node name:", error);
    return { success: false, message: error.message };
  }
}
