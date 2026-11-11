import torch
import torchvision
import flwr
import sklearn
import numpy
import pandas
import matplotlib

print("PyTorch:", torch.__version__)
print("Torchvision:", torchvision.__version__)
print("Flower:", flwr.__version__)
print("CUDA Available:", torch.cuda.is_available())

print("\nEnvironment berhasil disiapkan!")