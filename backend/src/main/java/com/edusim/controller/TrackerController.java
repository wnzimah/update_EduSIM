package com.edusim.controller;

import com.edusim.dto.TrackerDtos.CreateBusinessRequest;
import com.edusim.dto.TrackerDtos.CreateCashflowRequest;
import com.edusim.dto.TrackerDtos.CreateScheduleRequest;
import com.edusim.dto.TrackerDtos.UpdateScheduleStatusRequest;
import com.edusim.service.TrackerService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tracker")
public class TrackerController {

    private final TrackerService trackerService;

    public TrackerController(TrackerService trackerService) {
        this.trackerService = trackerService;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        return trackerService.dashboard();
    }

    @PostMapping("/schedule")
    public Map<String, Object> createSchedule(@Valid @RequestBody CreateScheduleRequest request) {
        return trackerService.createSchedule(request);
    }

    @PatchMapping("/schedule/{scheduleId}")
    public Map<String, Object> updateScheduleStatus(
        @PathVariable Long scheduleId,
        @Valid @RequestBody UpdateScheduleStatusRequest request
    ) {
        return trackerService.updateScheduleStatus(scheduleId, request);
    }

    @DeleteMapping("/schedule/{scheduleId}")
    public Map<String, Object> deleteSchedule(@PathVariable Long scheduleId) {
        return trackerService.deleteSchedule(scheduleId);
    }

    @PostMapping("/cashflow")
    public Map<String, Object> createCashflow(@Valid @RequestBody CreateCashflowRequest request) {
        return trackerService.createCashflow(request);
    }

    @DeleteMapping("/cashflow/{cashflowId}")
    public Map<String, Object> deleteCashflow(@PathVariable Long cashflowId) {
        return trackerService.deleteCashflow(cashflowId);
    }

    @PostMapping("/business")
    public Map<String, Object> createBusiness(@Valid @RequestBody CreateBusinessRequest request) {
        return trackerService.createBusiness(request);
    }

    @DeleteMapping("/business/{businessId}")
    public Map<String, Object> deleteBusiness(@PathVariable Long businessId) {
        return trackerService.deleteBusiness(businessId);
    }
}
