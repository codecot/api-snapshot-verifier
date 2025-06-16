import type { Meta, StoryObj } from '@storybook/react';
import { FileDrop, useFileDrop } from './file-drop';
import { Upload, FileJson, FileText, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Card } from './card';
import { Button } from './button';

const meta = {
  title: 'Components/UI/FileDrop',
  component: FileDrop,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FileDrop>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [files, setFiles] = useState<File[]>([]);

    return (
      <div className="w-96 space-y-4">
        <FileDrop onDrop={setFiles}>
          {({ getRootProps, getInputProps, isDragActive }) => (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              {isDragActive ? (
                <p className="text-primary">Drop the files here...</p>
              ) : (
                <div>
                  <p className="text-gray-600">Drag & drop files here</p>
                  <p className="text-sm text-gray-400 mt-1">or click to select files</p>
                </div>
              )}
            </div>
          )}
        </FileDrop>
        
        {files.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Uploaded Files:</h3>
            <ul className="space-y-1">
              {files.map((file, index) => (
                <li key={index} className="text-sm text-gray-600">
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  },
};

export const AcceptSpecificTypes: Story = {
  render: () => {
    const [files, setFiles] = useState<File[]>([]);
    const [error, setError] = useState<string>('');

    return (
      <div className="w-96 space-y-4">
        <FileDrop 
          onDrop={(newFiles) => {
            setFiles(newFiles);
            setError('');
          }}
          accept={{
            'application/json': ['.json'],
            'text/yaml': ['.yaml', '.yml']
          }}
        >
          {({ getRootProps, getInputProps, isDragActive }) => (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
            >
              <input {...getInputProps()} />
              <FileJson className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              {isDragActive ? (
                <p className="text-primary">Drop your OpenAPI spec here...</p>
              ) : (
                <div>
                  <p className="text-gray-600">Drop OpenAPI spec here</p>
                  <p className="text-sm text-gray-400 mt-1">Accepts .json, .yaml, .yml files</p>
                </div>
              )}
            </div>
          )}
        </FileDrop>
        
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        
        {files.length > 0 && (
          <Card className="p-4 bg-green-50 border-green-200">
            <h3 className="font-semibold text-green-800">File accepted:</h3>
            <p className="text-sm text-green-700 mt-1">{files[0].name}</p>
          </Card>
        )}
      </div>
    );
  },
};

export const MultipleFiles: Story = {
  render: () => {
    const [files, setFiles] = useState<File[]>([]);

    return (
      <div className="w-96 space-y-4">
        <FileDrop 
          onDrop={setFiles}
          maxFiles={5}
        >
          {({ getRootProps, getInputProps, isDragActive }) => (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              {isDragActive ? (
                <p className="text-primary">Drop files here...</p>
              ) : (
                <div>
                  <p className="text-gray-600">Drop up to 5 files here</p>
                  <p className="text-sm text-gray-400 mt-1">or click to select</p>
                </div>
              )}
            </div>
          )}
        </FileDrop>
        
        {files.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Files ({files.length}/5)</h3>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setFiles([])}
              >
                Clear
              </Button>
            </div>
            <ul className="space-y-1">
              {files.map((file, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {file.name}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="w-96">
      <FileDrop onDrop={() => {}} disabled>
        {({ getRootProps, getInputProps }) => (
          <div
            {...getRootProps()}
            className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-not-allowed opacity-50"
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-400">File upload disabled</p>
          </div>
        )}
      </FileDrop>
    </div>
  ),
};

export const CustomStyling: Story = {
  render: () => {
    const [files, setFiles] = useState<File[]>([]);

    return (
      <div className="space-y-4">
        <div className="w-96">
          <FileDrop onDrop={setFiles}>
            {({ getRootProps, getInputProps, isDragActive }) => (
              <div
                {...getRootProps()}
                className={`
                  relative overflow-hidden rounded-xl p-12 text-center cursor-pointer
                  bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-950
                  border-2 transition-all duration-300
                  ${isDragActive 
                    ? 'border-blue-500 scale-105 shadow-xl' 
                    : 'border-transparent hover:border-blue-300 hover:shadow-lg'
                  }
                `}
              >
                <input {...getInputProps()} />
                <div className="relative z-10">
                  <Upload className={`h-16 w-16 mx-auto mb-4 transition-transform duration-300 ${
                    isDragActive ? 'text-blue-600 scale-110' : 'text-blue-400'
                  }`} />
                  {isDragActive ? (
                    <div>
                      <p className="text-xl font-semibold text-blue-700">Release to upload</p>
                      <p className="text-sm text-blue-600 mt-1">Your files will be processed</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-medium text-gray-700">Upload your files</p>
                      <p className="text-sm text-gray-500 mt-2">Drag & drop or click to browse</p>
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-blue-200/20" />
              </div>
            )}
          </FileDrop>
        </div>

        <div className="w-96">
          <FileDrop onDrop={setFiles}>
            {({ getRootProps, getInputProps, isDragActive }) => (
              <Card
                {...getRootProps()}
                className={`
                  p-6 cursor-pointer transition-all duration-200
                  ${isDragActive 
                    ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' 
                    : 'hover:shadow-md'
                  }
                `}
              >
                <input {...getInputProps()} />
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg transition-colors ${
                    isDragActive ? 'bg-primary text-white' : 'bg-gray-100'
                  }`}>
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {isDragActive ? 'Drop to upload' : 'Choose files'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or drag and drop here
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </FileDrop>
        </div>
      </div>
    );
  },
};

export const WithHook: Story = {
  render: () => {
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    
    const { getRootProps, getInputProps, isDragActive } = useFileDrop({
      onDrop: (files) => setUploadedFile(files[0]),
      accept: {
        'image/*': ['.png', '.jpg', '.jpeg', '.gif']
      }
    });

    return (
      <div className="w-96 space-y-4">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-all duration-200
            ${isDragActive 
              ? 'border-primary bg-primary/5 scale-105' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Upload an image</p>
          <p className="text-sm text-gray-400 mt-1">PNG, JPG, GIF up to 10MB</p>
        </div>
        
        {uploadedFile && (
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Image Details:</h3>
            <p className="text-sm">Name: {uploadedFile.name}</p>
            <p className="text-sm">Size: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            <p className="text-sm">Type: {uploadedFile.type}</p>
          </Card>
        )}
      </div>
    );
  },
};