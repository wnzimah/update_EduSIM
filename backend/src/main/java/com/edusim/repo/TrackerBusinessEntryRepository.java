package com.edusim.repo;

import com.edusim.model.TrackerBusinessEntry;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrackerBusinessEntryRepository extends JpaRepository<TrackerBusinessEntry, Long> {
    List<TrackerBusinessEntry> findAllByOrderByEntryDateDescCreatedAtDesc();
}
