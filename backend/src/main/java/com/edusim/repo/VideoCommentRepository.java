package com.edusim.repo;

import com.edusim.model.VideoComment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VideoCommentRepository extends JpaRepository<VideoComment, Long> {

    List<VideoComment> findByVideoIdOrderByCreatedAtDesc(Long videoId);
}
