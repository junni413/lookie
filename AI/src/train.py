# AI/src/train.py

import os
from ultralytics import YOLO


def train():
    # 모델 로드 (나노 버전)
    model = YOLO('yolov8n.pt')

    # 학습 시작
    # data.yaml 경로 등은 실제 환경에 맞게 수정 필요
    results = model.train(
        data='../configs/data.yaml',
        epochs=300,
        patience=100,
        imgsz=640,
        device='cpu', # 또는 0
        project='../runs/detect',
        name='banana_detect_v3_final'
    )
    
    print("Training Completed.")

if __name__ == '__main__':
    train()