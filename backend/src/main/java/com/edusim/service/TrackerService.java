package com.edusim.service;

import com.edusim.dto.TrackerDtos.CreateBusinessRequest;
import com.edusim.dto.TrackerDtos.CreateCashflowRequest;
import com.edusim.dto.TrackerDtos.CreateScheduleRequest;
import com.edusim.dto.TrackerDtos.UpdateScheduleStatusRequest;
import com.edusim.model.TrackerBusinessEntry;
import com.edusim.model.TrackerBusinessType;
import com.edusim.model.TrackerCashflowEntry;
import com.edusim.model.TrackerCashflowType;
import com.edusim.model.TrackerPriority;
import com.edusim.model.TrackerScheduleItem;
import com.edusim.repo.TrackerBusinessEntryRepository;
import com.edusim.repo.TrackerCashflowEntryRepository;
import com.edusim.repo.TrackerScheduleItemRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TrackerService {

    private final TrackerScheduleItemRepository scheduleItemRepository;
    private final TrackerCashflowEntryRepository cashflowEntryRepository;
    private final TrackerBusinessEntryRepository businessEntryRepository;

    public TrackerService(
        TrackerScheduleItemRepository scheduleItemRepository,
        TrackerCashflowEntryRepository cashflowEntryRepository,
        TrackerBusinessEntryRepository businessEntryRepository
    ) {
        this.scheduleItemRepository = scheduleItemRepository;
        this.cashflowEntryRepository = cashflowEntryRepository;
        this.businessEntryRepository = businessEntryRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dashboard() {
        List<TrackerScheduleItem> scheduleRows = scheduleItemRepository.findAllByOrderByDueDateAscCreatedAtDesc();
        List<TrackerCashflowEntry> cashflowRows = cashflowEntryRepository.findAllByOrderByEntryDateDescCreatedAtDesc();
        List<TrackerBusinessEntry> businessRows = businessEntryRepository.findAllByOrderByEntryDateDescCreatedAtDesc();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("schedule", scheduleRows.stream().map(this::toScheduleRow).toList());
        payload.put("cashflow", cashflowRows.stream().map(this::toCashflowRow).toList());
        payload.put("business", businessRows.stream().map(this::toBusinessRow).toList());
        payload.put("summary", buildSummary(cashflowRows, businessRows));
        payload.put("tomorrowTaskCount", scheduleItemRepository.countByDueDateAndDoneFalse(LocalDate.now().plusDays(1)));
        return payload;
    }

    @Transactional
    public Map<String, Object> createSchedule(CreateScheduleRequest request) {
        TrackerScheduleItem row = new TrackerScheduleItem();
        row.setTitle(request.title().trim());
        row.setDueDate(request.dueDate());
        row.setPriority(request.priority() == null ? TrackerPriority.MEDIUM : request.priority());
        row.setDone(false);
        return toScheduleRow(scheduleItemRepository.save(row));
    }

    @Transactional
    public Map<String, Object> updateScheduleStatus(Long id, UpdateScheduleStatusRequest request) {
        TrackerScheduleItem row = scheduleItemRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Schedule item not found"));

        row.setDone(Boolean.TRUE.equals(request.done()));
        return toScheduleRow(scheduleItemRepository.save(row));
    }

    @Transactional
    public Map<String, Object> deleteSchedule(Long id) {
        TrackerScheduleItem row = scheduleItemRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Schedule item not found"));
        scheduleItemRepository.delete(row);
        return Map.of("message", "Schedule item deleted");
    }

    @Transactional
    public Map<String, Object> createCashflow(CreateCashflowRequest request) {
        TrackerCashflowEntry row = new TrackerCashflowEntry();
        row.setEntryDate(request.entryDate());
        row.setType(request.type() == null ? TrackerCashflowType.IN : request.type());
        row.setAmount(requirePositiveMoney(request.amount()));
        row.setNote(request.note() == null ? "" : request.note().trim());
        return toCashflowRow(cashflowEntryRepository.save(row));
    }

    @Transactional
    public Map<String, Object> deleteCashflow(Long id) {
        TrackerCashflowEntry row = cashflowEntryRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cashflow entry not found"));
        cashflowEntryRepository.delete(row);
        return Map.of("message", "Cashflow entry deleted");
    }

    @Transactional
    public Map<String, Object> createBusiness(CreateBusinessRequest request) {
        TrackerBusinessEntry row = new TrackerBusinessEntry();
        row.setEntryDate(request.entryDate());
        row.setType(request.type() == null ? TrackerBusinessType.PURCHASE : request.type());
        row.setItem(request.item().trim());
        row.setAmount(requirePositiveMoney(request.amount()));
        return toBusinessRow(businessEntryRepository.save(row));
    }

    @Transactional
    public Map<String, Object> deleteBusiness(Long id) {
        TrackerBusinessEntry row = businessEntryRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Business entry not found"));
        businessEntryRepository.delete(row);
        return Map.of("message", "Business entry deleted");
    }

    private Map<String, Object> toScheduleRow(TrackerScheduleItem row) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", row.getId());
        payload.put("title", row.getTitle());
        payload.put("dueDate", row.getDueDate());
        payload.put("priority", row.getPriority());
        payload.put("done", row.isDone());
        payload.put("createdAt", row.getCreatedAt());
        return payload;
    }

    private Map<String, Object> toCashflowRow(TrackerCashflowEntry row) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", row.getId());
        payload.put("entryDate", row.getEntryDate());
        payload.put("type", row.getType());
        payload.put("amount", toMoney(row.getAmount()));
        payload.put("note", row.getNote() == null ? "" : row.getNote());
        payload.put("createdAt", row.getCreatedAt());
        return payload;
    }

    private Map<String, Object> toBusinessRow(TrackerBusinessEntry row) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", row.getId());
        payload.put("entryDate", row.getEntryDate());
        payload.put("type", row.getType());
        payload.put("item", row.getItem());
        payload.put("amount", toMoney(row.getAmount()));
        payload.put("createdAt", row.getCreatedAt());
        return payload;
    }

    private Map<String, Object> buildSummary(
        List<TrackerCashflowEntry> cashflowRows,
        List<TrackerBusinessEntry> businessRows
    ) {
        BigDecimal cashIn = BigDecimal.ZERO;
        BigDecimal cashOut = BigDecimal.ZERO;
        for (TrackerCashflowEntry row : cashflowRows) {
            BigDecimal amount = toMoney(row.getAmount());
            if (row.getType() == TrackerCashflowType.IN) {
                cashIn = cashIn.add(amount);
            } else {
                cashOut = cashOut.add(amount);
            }
        }

        BigDecimal businessCost = BigDecimal.ZERO;
        BigDecimal businessRevenue = BigDecimal.ZERO;
        for (TrackerBusinessEntry row : businessRows) {
            BigDecimal amount = toMoney(row.getAmount());
            if (row.getType() == TrackerBusinessType.SALE) {
                businessRevenue = businessRevenue.add(amount);
            } else {
                businessCost = businessCost.add(amount);
            }
        }

        BigDecimal cashBalance = cashIn.subtract(cashOut);
        BigDecimal businessProfit = businessRevenue.subtract(businessCost);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("cashInTotal", toMoney(cashIn));
        summary.put("cashOutTotal", toMoney(cashOut));
        summary.put("cashBalance", toMoney(cashBalance));
        summary.put("businessCostTotal", toMoney(businessCost));
        summary.put("businessRevenueTotal", toMoney(businessRevenue));
        summary.put("businessProfit", toMoney(businessProfit));
        return summary;
    }

    private BigDecimal requirePositiveMoney(BigDecimal amount) {
        if (amount == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Amount is required");
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Amount must be greater than zero");
        }
        return toMoney(amount);
    }

    private BigDecimal toMoney(BigDecimal amount) {
        if (amount == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return amount.setScale(2, RoundingMode.HALF_UP);
    }
}
