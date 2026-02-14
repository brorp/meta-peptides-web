import { NextResponse } from "next/server";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
};

export const successResponse = <T>(
  data: T,
  message = "Success",
  status = 200,
) => {
  const res: ApiResponse<T> = {
    success: true,
    message,
    data,
  };

  return NextResponse.json(res, { status });
};

export const errorResponse = (
  message = "Something went wrong",
  status = 500,
  error?: any,
) => {
  const res: ApiResponse<null> = {
    success: false,
    message,
    error,
  };

  return NextResponse.json(res, { status });
};
