import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Download,
  Info,
  Users,
  Crown
} from 'lucide-react';

interface BulkImportResult {
  successful: Array<{ originalData: any; createdProperty: any }>;
  failed: Array<{ originalData: any; error: string }>;
  skipped: Array<{ originalData: any; reason: string }>;
}

interface BulkPropertyImportProps {
  userRole: string;
  onComplete?: () => void;
}

export function BulkPropertyImport({ userRole, onComplete }: BulkPropertyImportProps) {
  const [csvData, setCsvData] = useState('');
  const [parsedProperties, setParsedProperties] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [activeTab, setActiveTab] = useState('input');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sample CSV template
  const sampleCsvData = `title,description,price,propertyType,bedrooms,bathrooms,sqft,address,city,state,zipCode
"Beautiful 3BR Home","Stunning home with modern updates",450000,house,3,2,2500,"123 Main St","San Francisco",CA,94102
"Downtown Condo","Luxury condo in prime location",680000,condo,2,2,1200,"456 Market St","San Francisco",CA,94105
"Family Townhouse","Spacious townhouse near schools",575000,townhouse,4,3,2800,"789 Oak Ave","Oakland",CA,94610`;

  const bulkImportMutation = useMutation({
    mutationFn: async (properties: any[]) => {
      return apiRequest('POST', '/api/properties/bulk-import', { properties });
    },
    onSuccess: (data: BulkImportResult) => {
      setImportResult(data);
      setActiveTab('results');
      
      const successCount = data.successful.length;
      const failedCount = data.failed.length;
      const skippedCount = data.skipped.length;
      
      toast({
        title: "Bulk Import Complete",
        description: `${successCount} successful, ${failedCount} failed, ${skippedCount} skipped`,
        variant: successCount > 0 ? "default" : "destructive",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      onComplete?.();
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import properties",
        variant: "destructive",
      });
    }
  });

  const parseCsvData = () => {
    try {
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV must have at least header and one data row');
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const properties = [];

      for (let i = 1; i < lines.length && i <= 51; i++) { // Limit to 50 properties
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        const property: any = {};

        headers.forEach((header, index) => {
          if (values[index] !== undefined) {
            const value = values[index];
            
            // Type conversion
            if (['price', 'sqft', 'bedrooms', 'bathrooms'].includes(header)) {
              property[header] = parseFloat(value) || 0;
            } else {
              property[header] = value;
            }
          }
        });

        // Validate required fields
        if (property.title && property.price && property.city) {
          properties.push(property);
        }
      }

      setParsedProperties(properties);
      setActiveTab('preview');
      
      toast({
        title: "CSV Parsed Successfully",
        description: `Found ${properties.length} valid properties`,
      });
    } catch (error: any) {
      toast({
        title: "Parse Error",
        description: error.message || "Failed to parse CSV data",
        variant: "destructive",
      });
    }
  };

  const startImport = () => {
    if (parsedProperties.length === 0) {
      toast({
        title: "No Properties",
        description: "Please parse CSV data first",
        variant: "destructive",
      });
      return;
    }

    bulkImportMutation.mutate(parsedProperties);
  };

  const downloadTemplate = () => {
    const blob = new Blob([sampleCsvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'property_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Check if user has bulk import access
  if (!['agency', 'expert', 'admin'].includes(userRole.toLowerCase())) {
    return (
      <Alert>
        <Crown className="h-4 w-4" />
        <AlertDescription>
          Bulk property import requires Agency or Expert tier. 
          <br />
          Upgrade your plan to access this feature.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold" data-testid="title-bulk-import">
            Bulk Property Import
          </h1>
          <p className="text-muted-foreground">
            Import up to 50 properties at once using CSV format
          </p>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="secondary" data-testid="badge-user-tier">
            <Users className="w-3 h-3 mr-1" />
            {userRole.toUpperCase()} TIER
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="input" data-testid="tab-input">1. Import Data</TabsTrigger>
          <TabsTrigger value="preview" data-testid="tab-preview">2. Preview</TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results">3. Results</TabsTrigger>
        </TabsList>

        {/* Input Tab */}
        <TabsContent value="input" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                CSV Data Input
              </CardTitle>
              <CardDescription>
                Paste your CSV data below or use our template to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">CSV Requirements:</h3>
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  data-testid="button-download-template"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Required columns: title, price, city. 
                  Optional: description, propertyType, bedrooms, bathrooms, sqft, address, state, zipCode
                </AlertDescription>
              </Alert>

              <Textarea
                placeholder="Paste your CSV data here..."
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                data-testid="textarea-csv-data"
              />

              <div className="flex justify-between">
                <div className="text-sm text-muted-foreground">
                  Maximum 50 properties per import
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCsvData(sampleCsvData)}
                    data-testid="button-load-sample"
                  >
                    Load Sample Data
                  </Button>
                  <Button
                    onClick={parseCsvData}
                    disabled={!csvData.trim()}
                    data-testid="button-parse-csv"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Parse CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Import Preview
                <Badge variant="outline" className="ml-auto">
                  {parsedProperties.length} Properties
                </Badge>
              </CardTitle>
              <CardDescription>
                Review the properties before importing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {parsedProperties.length > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Bed/Bath</TableHead>
                          <TableHead>Location</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedProperties.slice(0, 10).map((property, index) => (
                          <TableRow key={index} data-testid={`row-property-${index}`}>
                            <TableCell className="font-medium">
                              {property.title}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {property.propertyType || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              ${property.price?.toLocaleString() || '0'}
                            </TableCell>
                            <TableCell>
                              {property.bedrooms || 0}bd / {property.bathrooms || 0}ba
                            </TableCell>
                            <TableCell>
                              {property.city}, {property.state}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {parsedProperties.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center">
                      Showing first 10 of {parsedProperties.length} properties
                    </p>
                  )}

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('input')}
                      data-testid="button-back-to-input"
                    >
                      Back to Input
                    </Button>
                    <Button
                      onClick={startImport}
                      disabled={bulkImportMutation.isPending}
                      data-testid="button-start-import"
                    >
                      {bulkImportMutation.isPending ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Import {parsedProperties.length} Properties
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No properties to preview. Please go back and parse your CSV data.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          {importResult ? (
            <div className="space-y-6">
              {/* Results Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Import Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-center mb-2">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <div className="text-2xl font-bold text-green-700">
                        {importResult.successful.length}
                      </div>
                      <p className="text-sm text-green-600">Successful</p>
                    </div>

                    <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center justify-center mb-2">
                        <X className="w-8 h-8 text-red-600" />
                      </div>
                      <div className="text-2xl font-bold text-red-700">
                        {importResult.failed.length}
                      </div>
                      <p className="text-sm text-red-600">Failed</p>
                    </div>

                    <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center justify-center mb-2">
                        <AlertTriangle className="w-8 h-8 text-yellow-600" />
                      </div>
                      <div className="text-2xl font-bold text-yellow-700">
                        {importResult.skipped.length}
                      </div>
                      <p className="text-sm text-yellow-600">Skipped</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Failed Properties */}
              {importResult.failed.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">Failed Imports</CardTitle>
                    <CardDescription>
                      These properties could not be imported due to errors
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {importResult.failed.map((item, index) => (
                        <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="font-medium">{item.originalData.title}</div>
                          <div className="text-sm text-red-600">{item.error}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Skipped Properties */}
              {importResult.skipped.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-yellow-600">Skipped Properties</CardTitle>
                    <CardDescription>
                      These properties were skipped (usually due to reaching limits)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {importResult.skipped.map((item, index) => (
                        <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="font-medium">{item.originalData.title}</div>
                          <div className="text-sm text-yellow-600">{item.reason}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-center">
                <Button
                  onClick={() => {
                    setCsvData('');
                    setParsedProperties([]);
                    setImportResult(null);
                    setActiveTab('input');
                  }}
                  data-testid="button-new-import"
                >
                  Start New Import
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No import results yet. Complete an import to see results here.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}