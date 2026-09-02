import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Borramos la cookie seteando una fecha expirada
  response.cookies.set({
    name: "hyperisp_session",
    value: "",
    httpOnly: true,
    path: "/",
    expires: new Date(0),
  });

  return response;
}
