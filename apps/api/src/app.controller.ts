import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("Health")
@Controller()
export class AppController {
  @Get("health")
  @ApiOperation({
    summary: "Health check",
    description: "Returns the current server status and timestamp. No authentication required.",
  })
  @ApiResponse({
    status: 200,
    description: "Service is healthy",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "ok" },
        timestamp: { type: "string", format: "date-time", example: "2026-03-21T10:00:00.000Z" },
      },
    },
  })
  health(): { status: string; timestamp: string } {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
