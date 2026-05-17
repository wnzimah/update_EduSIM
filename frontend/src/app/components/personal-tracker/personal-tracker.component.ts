import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Observable } from "rxjs";
import {
  TrackerBusinessItem,
  TrackerBusinessType,
  TrackerCashflowItem,
  TrackerCashflowType,
  TrackerDashboard,
  TrackerPriority,
  TrackerScheduleItem,
  TrackerService
} from "../../services/tracker.service";

@Component({
  selector: "app-personal-tracker",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./personal-tracker.component.html",
  styleUrl: "./personal-tracker.component.css"
})
export class PersonalTrackerComponent implements OnInit {
  private readonly trackerService = inject(TrackerService);
  private readonly moneyFormatter = new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  dashboard: TrackerDashboard | null = null;
  loading = true;
  saving = false;
  errorMessage = "";
  mutationError = "";

  scheduleForm: { title: string; dueDate: string; priority: TrackerPriority } = {
    title: "",
    dueDate: this.toInputDate(this.addDays(new Date(), 1)),
    priority: "MEDIUM"
  };

  cashflowForm: { entryDate: string; type: TrackerCashflowType; amount: number | null; note: string } = {
    entryDate: this.toInputDate(new Date()),
    type: "IN",
    amount: null,
    note: ""
  };

  businessForm: { entryDate: string; type: TrackerBusinessType; item: string; amount: number | null } = {
    entryDate: this.toInputDate(new Date()),
    type: "PURCHASE",
    item: "",
    amount: null
  };

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = "";
    this.trackerService.dashboard().subscribe({
      next: (data) => {
        this.dashboard = data;
        this.loading = false;
        this.saving = false;
      },
      error: (error) => {
        this.loading = false;
        this.saving = false;
        this.errorMessage = error?.error?.message ?? "Gagal load data tracker.";
      }
    });
  }

  addSchedule(): void {
    const title = this.scheduleForm.title.trim();
    if (!title || !this.scheduleForm.dueDate) {
      return;
    }

    this.runMutation(
      this.trackerService.createSchedule({
        title,
        dueDate: this.scheduleForm.dueDate,
        priority: this.scheduleForm.priority
      }),
      () => {
        this.scheduleForm.title = "";
        this.scheduleForm.dueDate = this.toInputDate(this.addDays(new Date(), 1));
        this.scheduleForm.priority = "MEDIUM";
      }
    );
  }

  onScheduleDoneChange(item: TrackerScheduleItem, event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target) {
      return;
    }
    this.runMutation(this.trackerService.updateScheduleStatus(item.id, target.checked));
  }

  deleteSchedule(item: TrackerScheduleItem): void {
    this.runMutation(this.trackerService.deleteSchedule(item.id));
  }

  addCashflow(): void {
    const amount = Number(this.cashflowForm.amount);
    if (!this.cashflowForm.entryDate || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    this.runMutation(
      this.trackerService.createCashflow({
        entryDate: this.cashflowForm.entryDate,
        type: this.cashflowForm.type,
        amount,
        note: this.cashflowForm.note.trim()
      }),
      () => {
        this.cashflowForm.entryDate = this.toInputDate(new Date());
        this.cashflowForm.type = "IN";
        this.cashflowForm.amount = null;
        this.cashflowForm.note = "";
      }
    );
  }

  deleteCashflow(item: TrackerCashflowItem): void {
    this.runMutation(this.trackerService.deleteCashflow(item.id));
  }

  addBusiness(): void {
    const itemName = this.businessForm.item.trim();
    const amount = Number(this.businessForm.amount);
    if (!this.businessForm.entryDate || !itemName || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    this.runMutation(
      this.trackerService.createBusiness({
        entryDate: this.businessForm.entryDate,
        type: this.businessForm.type,
        item: itemName,
        amount
      }),
      () => {
        this.businessForm.entryDate = this.toInputDate(new Date());
        this.businessForm.type = "PURCHASE";
        this.businessForm.item = "";
        this.businessForm.amount = null;
      }
    );
  }

  deleteBusiness(item: TrackerBusinessItem): void {
    this.runMutation(this.trackerService.deleteBusiness(item.id));
  }

  scheduleRows(): TrackerScheduleItem[] {
    return this.dashboard?.schedule ?? [];
  }

  cashflowRows(): TrackerCashflowItem[] {
    return this.dashboard?.cashflow ?? [];
  }

  businessRows(): TrackerBusinessItem[] {
    return this.dashboard?.business ?? [];
  }

  todayLabel(): string {
    return new Date().toLocaleDateString("ms-MY", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  priorityLabel(value: TrackerPriority): string {
    if (value === "HIGH") {
      return "Tinggi";
    }
    if (value === "LOW") {
      return "Rendah";
    }
    return "Sederhana";
  }

  priorityClass(value: TrackerPriority): string {
    if (value === "HIGH") {
      return "tag-high";
    }
    if (value === "LOW") {
      return "tag-low";
    }
    return "tag-medium";
  }

  cashflowTypeLabel(type: TrackerCashflowType): string {
    return type === "IN" ? "Masuk" : "Keluar";
  }

  businessTypeLabel(type: TrackerBusinessType): string {
    return type === "SALE" ? "Jualan" : "Kos Pembelian";
  }

  formatMoney(value: number | string | null | undefined): string {
    const numeric = Number(value ?? 0);
    return this.moneyFormatter.format(Number.isFinite(numeric) ? numeric : 0);
  }

  formatDate(dateValue: string | null | undefined): string {
    if (!dateValue) {
      return "-";
    }
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }
    return date.toLocaleDateString("ms-MY", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  private runMutation(request$: Observable<unknown>, onSuccess?: () => void): void {
    this.mutationError = "";
    this.saving = true;
    request$.subscribe({
      next: () => {
        if (onSuccess) {
          onSuccess();
        }
        this.loadDashboard();
      },
      error: (error) => {
        this.saving = false;
        this.mutationError = error?.error?.message ?? "Tidak berjaya simpan perubahan.";
      }
    });
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }
}
