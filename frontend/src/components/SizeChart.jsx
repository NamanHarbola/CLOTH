import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Ruler } from 'lucide-react';

export default function SizeChart() {
  const sizeData = [
    { size: 'XS', chest: '86-91', waist: '71-76', hips: '91-96', length: '66' },
    { size: 'S', chest: '91-96', waist: '76-81', hips: '96-101', length: '68' },
    { size: 'M', chest: '96-101', waist: '81-86', hips: '101-106', length: '70' },
    { size: 'L', chest: '101-106', waist: '86-91', hips: '106-111', length: '72' },
    { size: 'XL', chest: '106-114', waist: '91-99', hips: '111-119', length: '74' },
    { size: 'XXL', chest: '114-122', waist: '99-107', hips: '119-127', length: '76' },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full sm:w-auto">
          <Ruler className="w-4 h-4 mr-2" />
          Size Chart
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Size Chart</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Size Guide */}
          <div>
            <h3 className="font-semibold mb-3">How to Measure</h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Chest</p>
                    <p className="text-muted-foreground">Measure around the fullest part of your chest</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Waist</p>
                    <p className="text-muted-foreground">Measure around your natural waistline</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Hips</p>
                    <p className="text-muted-foreground">Measure around the fullest part of your hips</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Length</p>
                    <p className="text-muted-foreground">Measure from shoulder to hem</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Size Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Size</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Chest (cm)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Waist (cm)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Hips (cm)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Length (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {sizeData.map((item, index) => (
                    <tr
                      key={item.size}
                      className={index % 2 === 0 ? 'bg-background' : 'bg-muted/50'}
                    >
                      <td className="px-4 py-3 font-semibold border-t">{item.size}</td>
                      <td className="px-4 py-3 text-sm border-t">{item.chest}</td>
                      <td className="px-4 py-3 text-sm border-t">{item.waist}</td>
                      <td className="px-4 py-3 text-sm border-t">{item.hips}</td>
                      <td className="px-4 py-3 text-sm border-t">{item.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
            <p className="font-medium">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>All measurements are in centimeters (cm)</li>
              <li>Measurements may vary by +/- 2cm depending on fabric stretch</li>
              <li>For best fit, compare with a similar garment you own</li>
              <li>If between sizes, we recommend sizing up for a relaxed fit</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
