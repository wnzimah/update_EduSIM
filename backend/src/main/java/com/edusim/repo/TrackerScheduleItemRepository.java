package com.edusim.repo;

import com.edusim.model.TrackerScheduleItem;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrackerScheduleItemRepository extends JpaRepository<TrackerScheduleItem, Long> {
    List<TrackerScheduleItem> findAllByOrderByDueDateAscCreatedAtDesc();

    long countByDueDateAndDoneFalse(LocalDate dueDate);
}
