import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentAgency } from "../common/decorators/current-agency.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { AnalyticsAggregationService } from "./services/analytics-aggregation.service";
import { ReportService } from "./services/report.service";
import { AnalyticsQueryDto } from "./dto/analytics-query.dto";
import { CreateReportDto } from "./dto/create-report.dto";

@ApiTags("Analytics")
@ApiBearerAuth()
@Controller("analytics")
@UseGuards(RolesGuard)
export class AnalyticsController {
  constructor(
    private readonly aggregation: AnalyticsAggregationService,
    private readonly reportService: ReportService
  ) {}

  // ---------------------------------------------------------------------------
  // Overview
  // ---------------------------------------------------------------------------

  @Get("overview")
  @ApiOperation({
    summary: "Get analytics overview",
    description:
      "Returns aggregated totals across all active social accounts: " +
      "total followers, average engagement rate, and total impressions.",
  })
  @ApiResponse({ status: 200, description: "Overview metrics retrieved" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async getOverview(@CurrentAgency() agencyId: string) {
    return this.aggregation.getOverview(agencyId);
  }

  // ---------------------------------------------------------------------------
  // Account metrics
  // ---------------------------------------------------------------------------

  @Get("accounts/:id")
  @ApiOperation({
    summary: "Get account metrics time series",
    description:
      "Returns analytics snapshots for a specific social account, " +
      "optionally filtered by date range.",
  })
  @ApiParam({ name: "id", description: "SocialAccount ID" })
  @ApiResponse({ status: 200, description: "Account metrics retrieved" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async getAccountMetrics(
    @Param("id") accountId: string,
    @Query() query: AnalyticsQueryDto
  ) {
    return this.aggregation.getAccountMetrics(accountId, {
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  // ---------------------------------------------------------------------------
  // Post metrics
  // ---------------------------------------------------------------------------

  @Get("posts/:id")
  @ApiOperation({
    summary: "Get post metrics",
    description:
      "Returns all analytics snapshots for a specific PostTarget " +
      "(likes, comments, shares, impressions, etc.).",
  })
  @ApiParam({ name: "id", description: "PostTarget ID" })
  @ApiResponse({ status: 200, description: "Post metrics retrieved" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async getPostMetrics(@Param("id") postTargetId: string) {
    return this.aggregation.getPostMetrics(postTargetId);
  }

  // ---------------------------------------------------------------------------
  // Reports — create
  // ---------------------------------------------------------------------------

  @Post("reports")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Generate an analytics report",
    description:
      "Creates an AnalyticsReport record and kicks off async data generation. " +
      "The report is immediately available but generatedData may be null until " +
      "the background task completes.",
  })
  @ApiResponse({ status: 201, description: "Report creation initiated" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async createReport(
    @CurrentAgency() agencyId: string,
    @Body() dto: CreateReportDto
  ) {
    return this.reportService.generateReport(agencyId, dto);
  }

  // ---------------------------------------------------------------------------
  // Reports — list
  // ---------------------------------------------------------------------------

  @Get("reports")
  @ApiOperation({
    summary: "List analytics reports",
    description: "Returns all analytics reports for the agency, newest first.",
  })
  @ApiResponse({ status: 200, description: "Reports retrieved" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async listReports(@CurrentAgency() agencyId: string) {
    return this.reportService.listReports(agencyId);
  }

  // ---------------------------------------------------------------------------
  // Reports — get one
  // ---------------------------------------------------------------------------

  @Get("reports/:id")
  @ApiOperation({
    summary: "Get an analytics report",
    description:
      "Returns a single analytics report including its generatedData payload.",
  })
  @ApiParam({ name: "id", description: "AnalyticsReport ID" })
  @ApiResponse({ status: 200, description: "Report retrieved" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Report not found" })
  async getReport(
    @CurrentAgency() agencyId: string,
    @Param("id") reportId: string
  ) {
    return this.reportService.getReport(agencyId, reportId);
  }

  // ---------------------------------------------------------------------------
  // Period comparison (bonus endpoint)
  // ---------------------------------------------------------------------------

  @Get("compare")
  @ApiOperation({
    summary: "Compare two analytics periods",
    description:
      "Compares follower counts, impressions, and engagement rates between " +
      "two date ranges. Requires p1Start, p1End, p2Start, p2End query params.",
  })
  @ApiResponse({ status: 200, description: "Comparison result" })
  @ApiResponse({ status: 400, description: "Invalid date parameters" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async compare(
    @CurrentAgency() agencyId: string,
    @Query("p1Start") p1Start: string,
    @Query("p1End") p1End: string,
    @Query("p2Start") p2Start: string,
    @Query("p2End") p2End: string
  ) {
    const dates = [p1Start, p1End, p2Start, p2End].map((d) => new Date(d));
    if (dates.some((d) => isNaN(d.getTime()))) {
      throw new BadRequestException(
        "p1Start, p1End, p2Start, and p2End must be valid ISO-8601 datetimes"
      );
    }
    const [d1s, d1e, d2s, d2e] = dates as [Date, Date, Date, Date];
    return this.aggregation.compare(agencyId, d1s, d1e, d2s, d2e);
  }
}
