import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

export type TrackerPriority = "HIGH" | "MEDIUM" | "LOW";
export type TrackerCashflowType = "IN" | "OUT";
export type TrackerBusinessType = "PURCHASE" | "SALE";

export interface TrackerScheduleItem {
  id: number;
  title: string;
  dueDate: string;
  priority: TrackerPriority;
  done: boolean;
  createdAt: string;
}

export interface TrackerCashflowItem {
  id: number;
  entryDate: string;
  type: TrackerCashflowType;
  amount: number;
  note: string;
  createdAt: string;
}

export interface TrackerBusinessItem {
  id: number;
  entryDate: string;
  type: TrackerBusinessType;
  item: string;
  amount: number;
  createdAt: string;
}

export interface TrackerSummary {
  cashInTotal: number;
  cashOutTotal: number;
  cashBalance: number;
  businessCostTotal: number;
  businessRevenueTotal: number;
  businessProfit: number;
}

export interface TrackerDashboard {
  schedule: TrackerScheduleItem[];
  cashflow: TrackerCashflowItem[];
  business: TrackerBusinessItem[];
  summary: TrackerSummary;
  tomorrowTaskCount: number;
}

@Injectable({ providedIn: "root" })
export class TrackerService {
  constructor(private readonly http: HttpClient) {}

  dashboard(): Observable<TrackerDashboard> {
    return this.http.get<TrackerDashboard>(`${environment.apiBaseUrl}/tracker/dashboard`);
  }

  createSchedule(payload: {
    title: string;
    dueDate: string;
    priority: TrackerPriority;
  }): Observable<TrackerScheduleItem> {
    return this.http.post<TrackerScheduleItem>(`${environment.apiBaseUrl}/tracker/schedule`, payload);
  }

  updateScheduleStatus(scheduleId: number, done: boolean): Observable<TrackerScheduleItem> {
    return this.http.patch<TrackerScheduleItem>(`${environment.apiBaseUrl}/tracker/schedule/${scheduleId}`, { done });
  }

  deleteSchedule(scheduleId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiBaseUrl}/tracker/schedule/${scheduleId}`);
  }

  createCashflow(payload: {
    entryDate: string;
    type: TrackerCashflowType;
    amount: number;
    note: string;
  }): Observable<TrackerCashflowItem> {
    return this.http.post<TrackerCashflowItem>(`${environment.apiBaseUrl}/tracker/cashflow`, payload);
  }

  deleteCashflow(cashflowId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiBaseUrl}/tracker/cashflow/${cashflowId}`);
  }

  createBusiness(payload: {
    entryDate: string;
    type: TrackerBusinessType;
    item: string;
    amount: number;
  }): Observable<TrackerBusinessItem> {
    return this.http.post<TrackerBusinessItem>(`${environment.apiBaseUrl}/tracker/business`, payload);
  }

  deleteBusiness(businessId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiBaseUrl}/tracker/business/${businessId}`);
  }
}
