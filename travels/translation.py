from modeltranslation.translator import translator, TranslationOptions
from travels import models

class CastTranslationOptions(TranslationOptions):
    fields = ('title', 'description')

class ItineraryTranslationOptions(TranslationOptions):
    fields = ('title', 'description')

class EventTranslationOptions(TranslationOptions):
    fields = ('title', 'description')

translator.register(models.Cast, CastTranslationOptions)
translator.register(models.Itinerary, ItineraryTranslationOptions)
translator.register(models.Event, EventTranslationOptions)
