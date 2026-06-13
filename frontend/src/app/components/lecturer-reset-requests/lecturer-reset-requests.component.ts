import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { forkJoin } from "rxjs";
import { LecturerService } from "../../services/lecturer.service";

type BulkAction = "" | "approve" | "reject" | "delete";

@Component({
  selector: "app-lecturer-reset-requests",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./lecturer-reset-requests.component.html",
  styleUrl: "./lecturer-reset-requests.component.css"
})
export class LecturerResetRequestsComponent implements OnInit {
  private readonly lecturerService = inject(LecturerService);
  private readonly selectedIds = new Set<number>();

  requests: any[] = [];
  loading = true;
  working = false;
  errorMessage = "";
  statusMessage = "";
  bulkAction: BulkAction = "";

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.loading = true;
    this.errorMessage = "";
    this.lecturerService.resetRequests().subscribe({
      next: (rows) => {
        this.requests = rows ?? [];
        this.selectedIds.clear();
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? "Failed to load reset requests";
        this.loading = false;
      }
    });
  }

  isSelected(requestId: number): boolean {
    return this.selectedIds.has(requestId);
  }

  toggleRequest(requestId: number, checked: boolean): void {
    if (checked) {
      this.selectedIds.add(requestId);
    } else {
      this.selectedIds.delete(requestId);
    }
  }

  toggleAll(checked: boolean): void {
    this.selectedIds.clear();
    if (checked) {
      for (const request of this.requests) {
        this.selectedIds.add(Number(request.requestId));
      }
    }
  }

  allSelected(): boolean {
    return this.requests.length > 0 && this.requests.every((request) => this.selectedIds.has(Number(request.requestId)));
  }

  selectedCount(): number {
    return this.selectedIds.size;
  }

  applyBulkAction(): void {
    if (!this.bulkAction || this.selectedIds.size === 0 || this.working) {
      return;
    }
    const selected = this.requests.filter((request) => this.selectedIds.has(Number(request.requestId)));
    const targets = this.bulkAction === "delete"
      ? selected
      : selected.filter((request) => this.isPending(request));
    if (targets.length === 0) {
      this.errorMessage = "Select at least one pending request for this action.";
      return;
    }

    const operations = targets.map((request) => {
      const requestId = Number(request.requestId);
      if (this.bulkAction === "approve") {
        return this.lecturerService.approveResetRequest(requestId);
      }
      if (this.bulkAction === "reject") {
        return this.lecturerService.rejectResetRequest(requestId);
      }
      return this.lecturerService.deleteResetRequest(requestId);
    });

    this.runAction(forkJoin(operations), `${targets.length} reset request(s) updated.`);
  }

  approve(request: any): void {
    this.runAction(this.lecturerService.approveResetRequest(Number(request.requestId)), "Reset request approved.");
  }

  reject(request: any): void {
    this.runAction(this.lecturerService.rejectResetRequest(Number(request.requestId)), "Reset request rejected.");
  }

  delete(request: any): void {
    this.runAction(this.lecturerService.deleteResetRequest(Number(request.requestId)), "Reset request deleted.");
  }

  isPending(request: any): boolean {
    return String(request?.status ?? "").toUpperCase() === "PENDING";
  }

  statusLabel(status: string): string {
    return String(status ?? "").replace(/_/g, " ").toUpperCase();
  }

  private runAction(request$: any, successMessage: string): void {
    if (this.working) {
      return;
    }
    this.working = true;
    this.errorMessage = "";
    this.statusMessage = "";
    request$.subscribe({
      next: () => {
        this.statusMessage = successMessage;
        this.bulkAction = "";
        this.working = false;
        this.loadRequests();
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message ?? "Action failed";
        this.working = false;
      }
    });
  }
}
