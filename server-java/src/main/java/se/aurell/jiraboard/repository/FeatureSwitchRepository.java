package se.aurell.jiraboard.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import se.aurell.jiraboard.entity.FeatureSwitch;

public interface FeatureSwitchRepository extends JpaRepository<FeatureSwitch, String> {

    /** The keys that are off; the only query a checked request makes. */
    @Query("select s.key from FeatureSwitch s where s.disabled = true")
    List<String> findDisabledKeys();
}
