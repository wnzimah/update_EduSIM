package com.edusim.repo;

import com.edusim.model.TrackerCashflowEntry;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrackerCashflowEntryRepository extends JpaRepository<TrackerCashflowEntry, Long> {
    List<TrackerCashflowEntry> findAllByOrderByEntryDateDescCreatedAtDesc();
}
