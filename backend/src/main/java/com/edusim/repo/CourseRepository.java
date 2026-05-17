package com.edusim.repo;

import com.edusim.model.Course;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<Course, Long> {
    List<Course> findByLecturerId(Long lecturerId);
    Optional<Course> findByIdAndLecturerId(Long id, Long lecturerId);
}
