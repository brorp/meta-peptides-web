import { ApiResponse } from "@/interface/global";
import { NextResponse } from "next/server";

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

export const paginateResponse = <T>(
  data: T,
  page: number,
  limit: number,
  count: number,
  message = "Data retrieved successfully",
) => {
  const totalPages = Math.ceil(count / limit);

  const res: ApiResponse<T> = {
    success: true,
    message,
    data,
    pagination: {
      total_items: count,
      total_pages: totalPages,
      current_page: page,
      limit: limit,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  };

  return NextResponse.json(res, { status: 200 });
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
