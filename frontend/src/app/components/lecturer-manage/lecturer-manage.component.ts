import { CommonModule } from "@angular/common";
import { Component, HostListener, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from "@angular/router";
import { forkJoin } from "rxjs";
import { LecturerService } from "../../services/lecturer.service";

type ContentItemType = "VIDEO" | "MATERIAL";
type AddMode = "VIDEO" | "MATERIAL";
type SettingsSection = "COURSE_CONTENT" | "LEARNING_RESOURCES" | "UPDATING_VIDEO";
type ManageTab = "CREATE" | "EDIT" | "CONTENT";

type ContentItem = {
  itemType: ContentItemType;
  id: number;
  title: string;
  description?: string;
  videoUrl?: string;
  durationMinutes?: number;
  sortOrder?: number;
  mandatory?: boolean;
  materialType?: string;
  resourceUrl?: string;
};

@Component({
  selector: "app-lecturer-manage",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: "./lecturer-manage.component.html",
  styleUrl: "./lecturer-manage.component.css"
})
export class LecturerManageComponent implements OnInit {
  private readonly lecturerService = inject(LecturerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  courses: any[] = [];
  quizzes: any[] = [];
  contentItems: ContentItem[] = [];

  selectedCourseId: number | null = null;
  selectedContentItem: ContentItem | null = null;
  actionMenuKey: string | null = null;
  addMode: AddMode = "VIDEO";
  manageTab: ManageTab = "CREATE";
  readonly settingsSections: Array<{ key: SettingsSection; label: string }> = [
    { key: "COURSE_CONTENT", label: "Course Content" },
    { key: "LEARNING_RESOURCES", label: "Learning Resources" },
    { key: "UPDATING_VIDEO", label: "Updating Video" }
  ];
  settingsSectionOpen: Record<SettingsSection, boolean> = {
    COURSE_CONTENT: true,
    LEARNING_RESOURCES: false,
    UPDATING_VIDEO: false
  };

  statusMessage = "";
  errorMessage = "";

  courseForm = {
    title: "",
    description: ""
  };

  courseEditForm = {
    title: "",
    description: ""
  };

  videoForm = {
    title: "",
    description: "",
    videoUrl: "",
    durationMinutes: 10,
    sortOrder: 1,
    mandatory: true
  };

  materialForm = {
    title: "",
    materialType: "PDF",
    resourceUrl: ""
  };

  editVideoForm = {
    title: "",
    description: "",
    videoUrl: "",
    durationMinutes: 10,
    sortOrder: 1,
    mandatory: true
  };

  editMaterialForm = {
    title: "",
    materialType: "PDF",
    resourceUrl: ""
  };

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const requestedCourseId = Number(params.get("courseId"));
      this.selectedCourseId = Number.isFinite(requestedCourseId) && requestedCourseId > 0
        ? requestedCourseId
        : this.selectedCourseId;

      const flash = String(params.get("flash") ?? "").trim();
      if (flash) {
        this.statusMessage = flash;
      }
      this.loadCourses();
    });
  }

  @HostListener("document:click")
  closeActionMenuOnOutsideClick(): void {
    this.actionMenuKey = null;
  }

  get currentCourse(): any | null {
    return this.courses.find((course) => course.courseId === this.selectedCourseId) ?? null;
  }

  get videoItems(): ContentItem[] {
    return this.contentItems
      .filter((item) => item.itemType === "VIDEO")
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  }

  get orderedContentItems(): ContentItem[] {
    const videos = this.videoItems;
    const materials = this.contentItems
      .filter((item) => item.itemType === "MATERIAL")
      .sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0));
    return [...videos, ...materials];
  }

  loadCourses(): void {
    this.lecturerService.courses().subscribe({
      next: (courses) => {
        const previouslySelected = this.selectedCourseId;
        this.courses = courses;
        const stillExists = courses.some((course) => course.courseId === previouslySelected);
        if (stillExists) {
          this.selectedCourseId = previouslySelected;
        } else if (courses.length > 0) {
          this.selectedCourseId = courses[0].courseId;
        } else {
          this.selectedCourseId = null;
        }
        if (!this.selectedCourseId) {
          this.manageTab = "CREATE";
        } else if (this.manageTab === "CREATE") {
          this.manageTab = "EDIT";
        }
        this.syncCourseEditor();
        this.loadQuizzes();
        this.loadCourseContent();
      },
      error: (error) => this.errorMessage = error?.error?.message ?? "Failed to load courses"
    });
  }

  loadQuizzes(): void {
    this.lecturerService.quizzes(this.selectedCourseId ?? undefined).subscribe({
      next: (quizzes) => this.quizzes = quizzes,
      error: (error) => this.errorMessage = error?.error?.message ?? "Failed to load quizzes"
    });
  }

  loadCourseContent(): void {
    if (!this.selectedCourseId) {
      this.contentItems = [];
      this.selectedContentItem = null;
      return;
    }

    this.lecturerService.courseContent(this.selectedCourseId).subscribe({
      next: (data) => {
        const videos: ContentItem[] = (data?.videos ?? []).map((item: any) => ({
          ...item,
          itemType: "VIDEO"
        }));
        const materials: ContentItem[] = (data?.materials ?? []).map((item: any) => ({
          ...item,
          itemType: "MATERIAL"
        }));
        videos.sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
        this.contentItems = [...videos, ...materials];
        if (!this.videoForm.title.trim() && !this.videoForm.videoUrl.trim()) {
          this.videoForm.sortOrder = this.nextVideoSortOrder();
        }
        this.restoreSelection();
      },
      error: (error) => this.errorMessage = error?.error?.message ?? "Failed to load course content"
    });
  }

  onCourseChange(raw: string): void {
    this.selectedCourseId = raw ? Number(raw) : null;
    this.selectedContentItem = null;
    this.actionMenuKey = null;
    this.manageTab = this.selectedCourseId ? "EDIT" : "CREATE";
    this.syncCourseEditor();
    this.loadQuizzes();
    this.loadCourseContent();
  }

  openCourseWorkspace(courseId: number): void {
    this.selectedCourseId = courseId;
    this.selectedContentItem = null;
    this.actionMenuKey = null;
    this.manageTab = "CONTENT";
    this.syncCourseEditor();
    this.loadQuizzes();
    this.loadCourseContent();
  }

  setManageTab(tab: ManageTab): void {
    this.manageTab = tab;
    if (tab === "CONTENT") {
      this.jumpToSection("content");
      return;
    }
    this.jumpToSection("course");
  }

  jumpToSection(section: "course" | "content"): void {
    const targetId = section === "course" ? "course-editor-anchor" : "content-editor-anchor";
    const target = document.getElementById(targetId);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  createCourse(): void {
    this.clearMessages();
    this.lecturerService.createCourse(this.courseForm).subscribe({
      next: (response) => {
        this.statusMessage = "Course created.";
        if (response?.courseId) {
          this.selectedCourseId = Number(response.courseId);
        }
        this.manageTab = "EDIT";
        this.courseForm = { title: "", description: "" };
        this.loadCourses();
      },
      error: (error) => this.errorMessage = error?.error?.message ?? "Failed to create course"
    });
  }

  updateSelectedCourse(): void {
    this.clearMessages();
    if (!this.selectedCourseId) {
      this.errorMessage = "Select a course first.";
      return;
    }
    this.lecturerService.updateCourse(this.selectedCourseId, this.courseEditForm).subscribe({
      next: () => {
        this.statusMessage = "Course settings updated.";
        this.loadCourses();
      },
      error: (error) => this.errorMessage = error?.error?.message ?? "Failed to update course"
    });
  }

  deleteCourse(courseId: number): void {
    this.clearMessages();
    if (!confirm("Delete this course and all related content?")) {
      return;
    }
    this.lecturerService.deleteCourse(courseId).subscribe({
      next: () => {
        this.statusMessage = "Course deleted.";
        if (this.selectedCourseId === courseId) {
          this.selectedCourseId = null;
          this.selectedContentItem = null;
          this.contentItems = [];
        }
        this.loadCourses();
      },
      error: (error) => this.errorMessage = error?.error?.message ?? "Failed to delete course"
    });
  }

  deleteSelectedCourse(): void {
    if (!this.selectedCourseId) {
      this.errorMessage = "Select a course first.";
      return;
    }
    this.deleteCourse(this.selectedCourseId);
  }

  setAddMode(mode: AddMode): void {
    this.addMode = mode;
    this.actionMenuKey = null;
  }

  toggleSettingsSection(section: SettingsSection): void {
    this.settingsSectionOpen[section] = !this.settingsSectionOpen[section];
  }

  isSettingsSectionOpen(section: SettingsSection): boolean {
    return Boolean(this.settingsSectionOpen[section]);
  }

  addVideo(): void {
    this.clearMessages();
    if (!this.selectedCourseId) {
      this.errorMessage = "Select a course first.";
      return;
    }
    this.lecturerService.addVideo(this.selectedCourseId, this.videoForm).subscribe({
      next: () => {
        this.statusMessage = "Video added.";
        this.manageTab = "CONTENT";
        this.videoForm = {
          title: "",
          description: "",
          videoUrl: "",
          durationMinutes: 10,
          sortOrder: this.nextVideoSortOrder(),
          mandatory: true
        };
        this.loadCourseContent();
        this.loadCourses();
      },
      error: (error) => this.errorMessage = error?.error?.message ?? "Failed to add video"
    });
  }

  addMaterial(): void {
    this.clearMessages();
    if (!this.selectedCourseId) {
      this.errorMessage = "Select a course first.";
      return;
    }
    this.lecturerService.addMaterial(this.selectedCourseId, this.materialForm).subscribe({
      next: () => {
        this.statusMessage = "Material added.";
        this.manageTab = "CONTENT";
        this.materialForm = {
          title: "",
          materialType: "PDF",
          resourceUrl: ""
        };
        this.loadCourseContent();
      },
      error: (error) => this.errorMessage = error?.error?.message ?? "Failed to add material"
    });
  }

  contentKey(item: ContentItem): string {
    return `${item.itemType}-${item.id}`;
  }

  toggleActions(item: ContentItem, event: Event): void {
    event.stopPropagation();
    const key = this.contentKey(item);
    this.actionMenuKey = this.actionMenuKey === key ? null : key;
  }

  selectContentItem(item: ContentItem): void {
    this.actionMenuKey = null;
    this.selectedContentItem = item;
    this.settingsSectionOpen = {
      COURSE_CONTENT: true,
      LEARNING_RESOURCES: false,
      UPDATING_VIDEO: item.itemType === "VIDEO"
    };
    if (item.itemType === "VIDEO") {
      this.editVideoForm = {
        title: item.title,
        description: item.description ?? "",
        videoUrl: item.videoUrl ?? "",
        durationMinutes: Number(item.durationMinutes ?? 10),
        sortOrder: Number(item.sortOrder ?? 1),
        mandatory: Boolean(item.mandatory)
      };
      return;
    }
    this.editMaterialForm = {
      title: item.title,
      materialType: item.materialType ?? "PDF",
      resourceUrl: item.resourceUrl ?? ""
    };
  }

  duplicateItem(item: ContentItem): void {
    this.clearMessages();
    this.actionMenuKey = null;
    const callback = item.itemType === "VIDEO"
      ? this.lecturerService.duplicateVideo(item.id)
      : this.lecturerService.duplicateMaterial(item.id);
    callback.subscribe({
      next: () => {
        this.statusMessage = `${item.itemType === "VIDEO" ? "Video" : "Material"} duplicated.`;
        this.loadCourseContent();
        this.loadCourses();
      },
      error: (error) => this.errorMessage = error?.error?.message ?? "Failed to duplicate content"
    });
  }

  canMoveVideo(item: ContentItem, direction: -1 | 1): boolean {
    if (item.itemType !== "VIDEO") {
      return false;
    }
    const videos = this.videoItems;
    const index = videos.findIndex((video) => video.id === item.id);
    if (index < 0) {
      return false;
    }
    const targetIndex = index + direction;
    return targetIndex >= 0 && targetIndex < videos.length;
  }

  moveVideo(item: ContentItem, direction: -1 | 1): void {
    if (!this.canMoveVideo(item, direction)) {
      return;
    }

    this.clearMessages();
    this.actionMenuKey = null;

    const videos = this.videoItems;
    const index = videos.findIndex((video) => video.id === item.id);
    const targetIndex = index + direction;
    const source = videos[index];
    const target = videos[targetIndex];

    const sourceSort = Number(source.sortOrder ?? index + 1);
    const targetSort = Number(target.sortOrder ?? targetIndex + 1);

    forkJoin([
      this.lecturerService.updateVideo(source.id, this.videoPayloadFromItem(source, targetSort)),
      this.lecturerService.updateVideo(target.id, this.videoPayloadFromItem(target, sourceSort))
    ]).subscribe({
      next: () => {
        this.statusMessage = "Video order updated.";
        this.loadCourseContent();
      },
      error: (error) => this.errorMessage = error?.error?.message ?? "Failed to reorder video"
    });
  }

  deleteItem(item: ContentItem): void {
    this.clearMessages();
    this.actionMenuKey = null;
    if (!confirm(`Delete "${item.title}"?`)) {
      return;
    }
    const callback = item.itemType === "VIDEO"
      ? this.lecturerService.deleteVideo(item.id)
      : this.lecturerService.deleteMaterial(item.id);
    callback.subscribe({
      next: () => {
        this.statusMessage = `${item.itemType === "VIDEO" ? "Video" : "Material"} deleted.`;
        if (this.selectedContentItem && this.contentKey(this.selectedContentItem) === this.contentKey(item)) {
          this.selectedContentItem = null;
        }
        this.loadCourseContent();
        this.loadCourses();
      },
      error: (error) => this.errorMessage = error?.error?.message ?? "Failed to delete content"
    });
  }

  saveSelectedItem(): void {
    this.clearMessages();
    if (!this.selectedContentItem) {
      return;
    }

    const item = this.selectedContentItem;
    const callback = item.itemType === "VIDEO"
      ? this.lecturerService.updateVideo(item.id, {
        title: this.editVideoForm.title.trim(),
        description: this.editVideoForm.description.trim(),
        videoUrl: this.editVideoForm.videoUrl.trim(),
        durationMinutes: Math.max(1, Number(this.editVideoForm.durationMinutes)),
        sortOrder: Math.max(1, Number(this.editVideoForm.sortOrder)),
        mandatory: Boolean(this.editVideoForm.mandatory)
      })
      : this.lecturerService.updateMaterial(item.id, {
        title: this.editMaterialForm.title.trim(),
        materialType: this.editMaterialForm.materialType.trim(),
        resourceUrl: this.editMaterialForm.resourceUrl.trim()
      });

    callback.subscribe({
      next: () => {
        this.statusMessage = `${item.itemType === "VIDEO" ? "Video" : "Material"} updated.`;
        this.loadCourseContent();
      },
      error: (error) => this.errorMessage = error?.error?.message ?? "Failed to update content"
    });
  }

  openLink(url: string | undefined): void {
    if (!url) {
      return;
    }
    window.open(url, "_blank", "noopener");
  }

  itemSubtitle(item: ContentItem): string {
    if (item.itemType === "VIDEO") {
      const duration = Number(item.durationMinutes ?? 0);
      const sort = Number(item.sortOrder ?? 0);
      const mandatory = item.mandatory ? "Mandatory" : "Optional";
      return `${duration} min | Order ${sort} | ${mandatory}`;
    }

    const typeLabel = item.materialType ?? "Material";
    return `${typeLabel} resource`;
  }

  isSelectedItem(item: ContentItem): boolean {
    if (!this.selectedContentItem) {
      return false;
    }
    return this.contentKey(item) === this.contentKey(this.selectedContentItem);
  }

  private restoreSelection(): void {
    if (!this.selectedContentItem && this.contentItems.length > 0) {
      this.selectContentItem(this.contentItems[0]);
      return;
    }

    if (!this.selectedContentItem) {
      return;
    }

    const key = this.contentKey(this.selectedContentItem);
    const found = this.contentItems.find((item) => this.contentKey(item) === key);
    if (!found) {
      if (this.contentItems.length > 0) {
        this.selectContentItem(this.contentItems[0]);
      } else {
        this.selectedContentItem = null;
      }
      return;
    }
    this.selectContentItem(found);
  }

  private syncCourseEditor(): void {
    if (!this.currentCourse) {
      this.courseEditForm = {
        title: "",
        description: ""
      };
      return;
    }

    this.courseEditForm = {
      title: this.currentCourse.title,
      description: this.currentCourse.description
    };
  }

  private nextVideoSortOrder(): number {
    const videos = this.videoItems;
    if (videos.length === 0) {
      return 1;
    }
    const highest = Math.max(...videos.map((item) => Number(item.sortOrder ?? 0)));
    return Math.max(1, highest + 1);
  }

  private videoPayloadFromItem(item: ContentItem, sortOrder: number): any {
    return {
      title: (item.title ?? "").trim() || "Video Lesson",
      description: (item.description ?? "").trim() || "Video lesson content",
      videoUrl: (item.videoUrl ?? "").trim(),
      durationMinutes: Math.max(1, Number(item.durationMinutes ?? 1)),
      sortOrder: Math.max(1, Number(sortOrder)),
      mandatory: Boolean(item.mandatory)
    };
  }

  private clearMessages(): void {
    this.statusMessage = "";
    this.errorMessage = "";
  }
}
