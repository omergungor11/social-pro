import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AnalyticsReport } from "@social-pro/prisma";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AnalyticsAggregationService } from "./analytics-aggregation.service";
import { CreateReportDto } from "../dto/create-report.dto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportOptions extends CreateReportDto {
  clientId?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aggregation: AnalyticsAggregationService
  ) {}

  // ---------------------------------------------------------------------------
  // Generate report (async — persists immediately, populates generatedData async)
  // ---------------------------------------------------------------------------

  async generateReport(
    agencyId: string,
    options: ReportOptions
  ): Promise<AnalyticsReport> {
    // Create the report record synchronously
    const report = await this.prisma.analyticsReport.create({
      data: {
        agencyId,
        clientId: options.clientId ?? null,
        title: options.title,
        reportType: options.reportType,
        dateRangeStart: new Date(options.dateRangeStart),
        dateRangeEnd: new Date(options.dateRangeEnd),
        generatedData: null,
        pdfUrl: null,
      },
    });

    this.logger.log(
      `AnalyticsReport created: id=${report.id} agencyId=${agencyId} type=${report.reportType}`
    );

    // Populate the data asynchronously so the HTTP response is immediate
    this.populateReportData(report.id, agencyId, options).catch((err) => {
      this.logger.error(
        `Failed to populate report data for id=${report.id}: ${String(err)}`
      );
    });

    return report;
  }

  // ---------------------------------------------------------------------------
  // List reports
  // ---------------------------------------------------------------------------

  async listReports(agencyId: string): Promise<AnalyticsReport[]> {
    return this.prisma.analyticsReport.findMany({
      where: { agencyId },
      orderBy: { createdAt: "desc" },
    });
  }

  // ---------------------------------------------------------------------------
  // Get single report
  // ---------------------------------------------------------------------------

  async getReport(agencyId: string, reportId: string): Promise<AnalyticsReport> {
    const report = await this.prisma.analyticsReport.findFirst({
      where: { id: reportId, agencyId },
    });

    if (!report) {
      throw new NotFoundException(
        `AnalyticsReport '${reportId}' not found in this agency`
      );
    }

    return report;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async populateReportData(
    reportId: string,
    agencyId: string,
    options: ReportOptions
  ): Promise<void> {
    const overview = await this.aggregation.getOverview(agencyId);

    const comparison = await this.aggregation.compare(
      agencyId,
      new Date(options.dateRangeStart),
      new Date(options.dateRangeEnd),
      this.shiftPeriodBack(
        new Date(options.dateRangeStart),
        new Date(options.dateRangeEnd)
      ).start,
      this.shiftPeriodBack(
        new Date(options.dateRangeStart),
        new Date(options.dateRangeEnd)
      ).end
    );

    const generatedData = {
      overview,
      comparison,
      generatedAt: new Date().toISOString(),
    };

    await this.prisma.analyticsReport.update({
      where: { id: reportId },
      data: { generatedData },
    });

    this.logger.log(`Report data populated: id=${reportId}`);
  }

  /**
   * Shifts a period back by its own duration to get the previous comparable period.
   */
  private shiftPeriodBack(
    start: Date,
    end: Date
  ): { start: Date; end: Date } {
    const durationMs = end.getTime() - start.getTime();
    return {
      start: new Date(start.getTime() - durationMs),
      end: new Date(start.getTime() - 1),
    };
  }
}
