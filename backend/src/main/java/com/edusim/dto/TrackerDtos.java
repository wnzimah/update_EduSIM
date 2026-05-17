package com.edusim.dto;

import com.edusim.model.TrackerBusinessType;
import com.edusim.model.TrackerCashflowType;
import com.edusim.model.TrackerPriority;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public class TrackerDtos {

    public record CreateScheduleRequest(
        @NotBlank(message = "Title is required")
        @Size(max = 220, message = "Title is too long")
        String title,

        @NotNull(message = "Due date is required")
        LocalDate dueDate,

        TrackerPriority priority
    ) {}

    public record UpdateScheduleStatusRequest(
        @NotNull(message = "Done status is required")
        Boolean done
    ) {}

    public record CreateCashflowRequest(
        @NotNull(message = "Date is required")
        LocalDate entryDate,

        TrackerCashflowType type,

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        BigDecimal amount,

        @Size(max = 400, message = "Note is too long")
        String note
    ) {}

    public record CreateBusinessRequest(
        @NotNull(message = "Date is required")
        LocalDate entryDate,

        TrackerBusinessType type,

        @NotBlank(message = "Item is required")
        @Size(max = 220, message = "Item is too long")
        String item,

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        BigDecimal amount
    ) {}
}
