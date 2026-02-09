# 📦 AI 기반 물류 결함 탐지

> YOLOv8을 활용하여 물류 환경에서 결함을 탐지하는 객체 인식 모델을 개발하는 폴더입니다.

---

## 기술 스택

| 구분               | 기술                      |
| ---------------- | ----------------------- |
| Language         | Python                  |
| Model            | YOLOv8                  |
| Augmentation     | Albumentations          |
| Image Processing | OpenCV                  |
| Environment      | SSAFY Linux / Local GPU |
| Collaboration    | GitLab                  |

---

## 프로젝트 구조

```text
AI/
├── notebooks/          # 실험 및 모델 학습 노트북
├── src/                # 학습/추론/증강 코드
├── models/             # 학습된 모델 (best.pt)
├── configs/            # data.yaml 등 설정 파일
├── README.md
└── .gitignore
```

---

## 데이터셋 설명

* 객체 탐지를 위한 이미지 데이터셋
* train / valid / test 구조 사용
* Bounding Box 형식: **YOLO format**

```text
train/
 ├── images/
 └── labels/
```

---

## 데이터 증강 (Augmentation)

소량 데이터 환경에서도 학습 안정성을 확보하기 위해
Albumentations 기반 데이터 증강을 적용했습니다.

* Horizontal / Vertical Flip
* RandomRotate90
* Rotation (±15°)
* Brightness / Contrast 조절
* Bounding Box 자동 변환 (YOLO)

---