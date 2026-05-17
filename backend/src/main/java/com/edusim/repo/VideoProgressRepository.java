package com.edusim.repo;

import com.edusim.model.VideoProgress;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VideoProgressRepository extends JpaRepository<VideoProgress, Long> {
    Optional<VideoProgress> findByStudentIdAndVideoId(Long studentId, Long videoId);
    List<VideoProgress> findByStudentIdAndVideoCourseId(Long studentId, Long courseId);
    long countByStudentIdAndVideoCourseIdAndCompletedTrue(Long studentId, Long courseId);
    void deleteByVideoId(Long videoId);
    void deleteByVideoCourseId(Long courseId);
}
